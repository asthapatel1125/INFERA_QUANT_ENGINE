from __future__ import annotations

import copy
import json
import logging
import threading
import time
from collections import deque
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.engines import AlertEngine, GreekEngine, MicrostructureEngine, SignalEngine, ZoneEngine

logger = logging.getLogger(__name__)


class StreamManager:
    def __init__(self, provider, repository, interval: float = 1.5) -> None:
        self.provider = provider
        self.repository = repository
        self.interval = interval
        self.zone_engine = ZoneEngine()
        self.greek_engine = GreekEngine()
        self.micro_engine = MicrostructureEngine()
        self.signal_engine = SignalEngine()
        self.alert_engine = AlertEngine()
        self.lock = threading.RLock()
        self.stop_event = threading.Event()
        self.ready_event = threading.Event()
        self.started = False
        self.initializing = False
        self.last_compute_error: str | None = None
        self.latest: dict = {}
        self.alerts: deque[dict] = deque(maxlen=100)

    @staticmethod
    def _time_context(now: datetime) -> dict:
        try:
            eastern_zone = ZoneInfo("America/New_York")
        except ZoneInfoNotFoundError:
            # Minimal environments can lack the IANA database; production installs tzdata.
            eastern_zone = timezone(timedelta(hours=-5), "ET")
        eastern = now.astimezone(eastern_zone)
        minute = eastern.hour * 60 + eastern.minute
        if minute < 570:
            phase, bias, expected = "OPEN", "DISCOVERY", "Opening auction; expect wider spreads and rapid repricing."
        elif minute < 660:
            phase, bias, expected = "MORNING", "MOMENTUM", "Directional follow-through is more likely while liquidity builds."
        elif minute < 810:
            phase, bias, expected = "MIDDAY", "MEAN_REVERSION", "Lower participation favors compression and failed breakouts."
        elif minute < 930:
            phase, bias, expected = "AFTERNOON", "REPOSITIONING", "Dealer hedging and institutional repositioning can strengthen trends."
        else:
            phase, bias, expected = "CLOSE", "ACCELERATION", "Closing flows can amplify imbalance and volatility."
        return {
            "current_hour": eastern.strftime("%H:%M:%S ET"),
            "session_phase": phase,
            "session_bias": bias,
            "expected_behavior": expected,
        }

    @staticmethod
    def _factor_context(raw: dict, exposures: dict, micro: dict, time_context: dict) -> dict:
        greek = exposures["regime_details"]
        gamma_force = min(1.0, abs(greek["gamma_slope"]) * 50)
        drift_force = min(1.0, (abs(greek["vanna_drift"]) + abs(greek["charm_drift"])) * 4)
        greek_score = round((gamma_force + drift_force + exposures["greek_stability"]) / 3, 3)
        greek_regime = (
            "DIRECTIONAL" if gamma_force > .55
            else "UNSTABLE" if exposures["greek_stability"] < .45
            else "BALANCED"
        )
        vol_expansion = round(float(raw["volatility"]), 3)
        vol_compression = round(float(raw["compression"]), 3)
        volatility_regime = (
            "EXPANDING" if vol_expansion > .65
            else "COMPRESSED" if vol_compression > .65
            else "NORMAL"
        )
        micro_regime = (
            "STABLE" if micro["micro_stability"] >= .65
            else "FRAGILE" if micro["micro_stability"] < .4
            else "MIXED"
        )
        time_weights = {"OPEN": .78, "MORNING": .72, "MIDDAY": .45, "AFTERNOON": .68, "CLOSE": .82}
        combined = round(
            .35 * greek_score
            + .25 * max(vol_expansion, vol_compression)
            + .25 * micro["micro_stability"]
            + .15 * time_weights[time_context["session_phase"]],
            3,
        )
        term_slope = round(float(micro.get("iv_slope", 0)), 4)
        volatility_context = {
            "iv_expansion": vol_expansion,
            "iv_compression": vol_compression,
            "vol_of_vol": micro["vol_of_vol"],
            "term_structure_slope": term_slope,
            "regime": volatility_regime,
        }
        micro_context = {
            "quote_imbalance": micro["quote_imbalance"],
            "microprice_direction": (
                "UP" if micro["microprice"] > micro["midprice"]
                else "DOWN" if micro["microprice"] < micro["midprice"]
                else "FLAT"
            ),
            "sweep_detected": micro["sweep_detected"],
            "spread_regime": micro["spread_regime"],
            "liquidity_score": micro["liquidity_score"],
            "microstructure_stability": micro["micro_stability"],
            "regime": micro_regime,
        }
        return {
            "greek_regime": greek_regime,
            "greek_score": greek_score,
            "time_regime": time_context["session_bias"],
            "volatility_regime": volatility_regime,
            "microstructure_regime": micro_regime,
            "combined_zone_score": combined,
            "greeks": greek,
            "volatility_context": volatility_context,
            "microstructure_context": micro_context,
            "time_context": time_context,
        }

    def start(self) -> None:
        initialize = False
        with self.lock:
            if not self.started and not self.initializing:
                self.initializing = True
                initialize = True

        if initialize:
            try:
                self._compute()
            except Exception as exc:
                logger.exception("Initial market snapshot failed")
                with self.lock:
                    self.last_compute_error = str(exc)
                    self.initializing = False
                raise
            else:
                with self.lock:
                    self.started = True
                    self.initializing = False
                    self.last_compute_error = None
                    self.ready_event.set()
                threading.Thread(target=self._run, name="market-stream", daemon=True).start()
        else:
            # Concurrent SSE requests arrive together. Wait for the request performing
            # the initial vendor refresh instead of returning an empty packet.
            self.ready_event.wait(timeout=90)

    def _run(self) -> None:
        while not self.stop_event.wait(self.interval):
            try:
                self._compute()
                with self.lock:
                    self.last_compute_error = None
                    self.ready_event.set()
            except Exception as exc:
                logger.exception("Market stream refresh failed")
                with self.lock:
                    self.last_compute_error = str(exc)

    def _compute(self) -> None:
        raw = self.provider.snapshot()
        now = datetime.now(timezone.utc)
        timestamp = now.isoformat()
        micro = self.micro_engine.compute(raw)
        exposures = self.greek_engine.compute(self.provider.option_chain(raw["spot"]), raw["spot"])
        time_context = self._time_context(now)
        factors = self._factor_context(raw, exposures, micro, time_context)
        zone_input = {
            **raw,
            "liquidity": micro["liquidity_score"],
            "micro_stability": micro["micro_stability"],
            **factors,
        }
        zone = self.zone_engine.compute(zone_input, timestamp)
        zone.update({
            "symbol": raw.get("symbol", ""),
            "spot": raw["spot"],
            "data_source": raw.get("data_source", "unknown"),
            "determination": {
                "greek_regime": factors["greek_regime"],
                "time_regime": factors["time_regime"],
                "volatility_regime": factors["volatility_regime"],
                "microstructure_stability": micro["micro_stability"],
                "combined_zone_score": factors["combined_zone_score"],
            },
            "greeks": factors["greeks"],
            "time_context": time_context,
            "volatility_context": factors["volatility_context"],
            "microstructure_context": factors["microstructure_context"],
            "why": [
                f"Greek regime is {factors['greek_regime'].lower()} with a {factors['greek_score']:.2f} factor score.",
                f"Volatility is {factors['volatility_regime'].lower()} and term slope is {factors['volatility_context']['term_structure_slope']:+.4f}.",
                f"Microstructure is {factors['microstructure_regime'].lower()} with {micro['micro_stability']:.2f} stability.",
                f"{time_context['session_phase'].title()} session bias is {time_context['session_bias'].lower()}.",
            ],
        })
        exposures.update({
            "symbol": raw.get("symbol", ""),
            "data_source": raw.get("data_source", "unknown"),
        })
        micro.update({
            "symbol": raw.get("symbol", ""),
            "data_source": raw.get("data_source", "unknown"),
        })
        scores = self.signal_engine.compute(exposures, micro)
        alert = self.alert_engine.compute(zone, scores, micro)
        for packet in (micro, exposures, scores, alert):
            packet["timestamp"] = timestamp

        if alert["active"]:
            self.alerts.appendleft(copy.deepcopy(alert))

        with self.lock:
            self.latest = {
                "zones": zone,
                "exposures": exposures,
                "micro": micro,
                "scores": scores,
                "alerts": alert,
            }

        self.repository.insert("zones", {
            "timestamp": timestamp, "zone": zone["zone"], "stability": zone["stability"],
            "transition_flag": zone["transition_flag"],
        })
        self.repository.insert("signals", {"timestamp": timestamp, **scores})
        self.repository.insert("exposures", {
            "timestamp": timestamp,
            "gamma_exposure": exposures["totals"]["gex"],
            "delta_exposure": exposures["totals"]["dex"],
            "vega_exposure": exposures["totals"]["vex"],
            "theta_exposure": exposures["totals"]["tex"],
            "rho_exposure": exposures["totals"]["rex"],
            "call_wall": exposures["call_wall"],
            "put_wall": exposures["put_wall"],
            "gamma_flip_lower": exposures["gamma_flip_lower"],
            "gamma_flip_upper": exposures["gamma_flip_upper"],
        })
        if alert["active"]:
            self.repository.insert("alerts", {
                "timestamp": timestamp, "tier": alert["tier"], "direction": alert["direction"],
                "zone": alert["zone"], "precision": alert["precision"], "explosion": alert["explosion"],
            })

    def get(self, channel: str) -> dict:
        self.start()
        self.ready_event.wait(timeout=90)
        with self.lock:
            return copy.deepcopy(self.latest.get(channel, {}))

    def diagnostics(self) -> dict:
        with self.lock:
            return {
                "ready": self.ready_event.is_set(),
                "started": self.started,
                "initializing": self.initializing,
                "last_compute_error": self.last_compute_error,
                "channels": sorted(self.latest),
            }

    def get_alerts(self) -> list[dict]:
        self.start()
        with self.lock:
            return list(copy.deepcopy(self.alerts))

    def event_stream(self, channel: str):
        self.start()
        previous = ""
        while True:
            packet = self.get(channel)
            if not packet:
                yield "retry: 3000\n: waiting-for-first-snapshot\n\n"
                time.sleep(1)
                continue
            payload = json.dumps(packet, separators=(",", ":"))
            if payload != previous:
                yield f"event: {channel}\ndata: {payload}\n\n"
                previous = payload
            else:
                yield ": keep-alive\n\n"
            time.sleep(self.interval)
