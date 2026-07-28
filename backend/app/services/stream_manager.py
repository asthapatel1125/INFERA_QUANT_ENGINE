from __future__ import annotations

import copy
import json
import threading
import time
from collections import deque
from datetime import datetime, timezone

from app.engines import AlertEngine, GreekEngine, MicrostructureEngine, SignalEngine, ZoneEngine


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
        self.started = False
        self.latest: dict = {}
        self.alerts: deque[dict] = deque(maxlen=100)

    def start(self) -> None:
        with self.lock:
            if self.started:
                return
            self.started = True
            self._compute()
            threading.Thread(target=self._run, name="market-stream", daemon=True).start()

    def _run(self) -> None:
        while not self.stop_event.wait(self.interval):
            self._compute()

    def _compute(self) -> None:
        raw = self.provider.snapshot()
        timestamp = datetime.now(timezone.utc).isoformat()
        micro = self.micro_engine.compute(raw)
        zone_input = {
            **raw,
            "liquidity": micro["liquidity_score"],
            "micro_stability": micro["micro_stability"],
        }
        zone = self.zone_engine.compute(zone_input, timestamp)
        exposures = self.greek_engine.compute(self.provider.option_chain(raw["spot"]), raw["spot"])
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
        with self.lock:
            return copy.deepcopy(self.latest.get(channel, {}))

    def get_alerts(self) -> list[dict]:
        self.start()
        with self.lock:
            return list(copy.deepcopy(self.alerts))

    def event_stream(self, channel: str):
        self.start()
        previous = ""
        while True:
            payload = json.dumps(self.get(channel), separators=(",", ":"))
            if payload != previous:
                yield f"event: {channel}\ndata: {payload}\n\n"
                previous = payload
            else:
                yield ": keep-alive\n\n"
            time.sleep(self.interval)
