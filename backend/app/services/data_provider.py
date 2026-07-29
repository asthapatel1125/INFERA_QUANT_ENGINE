from __future__ import annotations

import logging
import math
import random
import statistics
import threading
import time
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from collections import deque
from datetime import date, timedelta
from typing import Any

logger = logging.getLogger(__name__)

GREEK_FIELDS = (
    "gamma", "delta", "vega", "theta", "rho", "vanna", "charm",
    "vomma", "veta", "speed", "zomma", "color",
)


def _number(value: Any, default: float = 0.0) -> float:
    try:
        result = float(value)
        return result if math.isfinite(result) else default
    except (TypeError, ValueError):
        return default


def _records(frame: Any) -> list[dict[str, Any]]:
    """Convert ThetaData's Polars or Pandas dataframe to plain records."""
    if frame is None:
        return []
    if hasattr(frame, "to_dicts"):
        return frame.to_dicts()
    if hasattr(frame, "to_dict"):
        return frame.to_dict(orient="records")
    if isinstance(frame, list):
        return frame
    raise TypeError(f"Unsupported ThetaData response type: {type(frame).__name__}")


def _contract_key(row: dict[str, Any]) -> tuple[str, float, str]:
    expiry = row.get("expiration")
    if hasattr(expiry, "isoformat"):
        expiry = expiry.isoformat()
    return str(expiry), round(_number(row.get("strike")), 4), str(row.get("right", "")).lower()


class SyntheticDataProvider:
    """Deterministic fallback feed used when a configured vendor is unavailable."""

    source_name = "synthetic"

    def __init__(self, seed: int = 41) -> None:
        self.random = random.Random(seed)
        self.tick = 0
        self.spot = 524.0

    def diagnostics(self) -> dict[str, Any]:
        return {"source": self.source_name, "healthy": True, "fallback": False}

    def snapshot(self) -> dict[str, Any]:
        self.tick += 1
        wave = math.sin(self.tick / 8)
        self.spot += self.random.uniform(-0.35, 0.35) + wave * 0.035
        spread = self.random.choice([0.01, 0.01, 0.02])
        bid = round(self.spot - spread / 2, 3)
        ask = round(self.spot + spread / 2, 3)
        bid_size = self.random.randint(300, 1500)
        ask_size = self.random.randint(300, 1500)
        average_size = self.random.randint(80, 180)
        return {
            "symbol": "SYNTH",
            "data_source": self.source_name,
            "spot": round(self.spot, 3),
            "price_trend": math.sin(self.tick / 17),
            "volatility": (math.sin(self.tick / 13) + 1) / 2,
            "compression": (math.cos(self.tick / 11) + 1) / 2,
            "reversal_pressure": (math.sin(self.tick / 19 + 2) + 1) / 2,
            "bid": bid, "ask": ask, "bid_size": bid_size, "ask_size": ask_size,
            "tick_size": 0.01,
            "trade_size": average_size * self.random.choice([1, 1, 2, 4]),
            "average_trade_size": average_size,
            "tape_speed": self.random.uniform(12, 60),
            "iv_slope": -0.025 + wave * 0.013,
            "vol_of_vol": 0.28 + math.cos(self.tick / 9) * 0.08,
            "term_structure": [
                {"expiry": label, "iv": round(0.18 + index * 0.012 + wave * 0.008, 4)}
                for index, label in enumerate(["7D", "14D", "30D", "60D", "90D"])
            ],
        }

    def option_chain(self, spot: float) -> list[dict[str, Any]]:
        rows = []
        base = round(spot / 5) * 5
        for days in [7, 30, 60]:
            expiry = (date.today() + timedelta(days=days)).isoformat()
            for strike in range(base - 30, base + 35, 5):
                distance = (strike - spot) / max(spot * 0.18 * math.sqrt(days / 365), 1)
                density = math.exp(-(distance**2) / 2)
                for option_type in ["call", "put"]:
                    side = 1 if option_type == "call" else -1
                    rows.append({
                        "expiry": expiry, "strike": strike, "type": option_type,
                        "open_interest": int(400 + density * 5200 + self.random.randint(0, 500)),
                        "gamma": density * 0.018 * (1 if option_type == "call" else -0.7),
                        "delta": side * (0.5 - 0.35 * math.tanh(distance)),
                        "vega": density * 0.16, "theta": -density * 0.075,
                        "rho": side * density * 0.04,
                        "vanna": -side * distance * density * 0.05,
                        "charm": side * distance * density * 0.035,
                        "vomma": density * (1 + abs(distance)) * 0.08,
                        "veta": -density * 0.045, "speed": -distance * density * 0.012,
                        "zomma": density * (distance**2 - 1) * 0.014,
                        "color": -density * 0.011,
                    })
        return rows


class VendorDataProvider:
    """Twelve Data spot + ThetaData Options Pro chain with cached fallback."""

    source_name = "twelvedata+thetadata"

    def __init__(
        self,
        symbol: str,
        twelve_api_key: str,
        theta_api_key: str,
        *,
        price_ttl: float = 60,
        chain_ttl: float = 15,
        oi_ttl: float = 900,
        max_dte: int = 90,
        strike_range: int = 30,
        fallback: SyntheticDataProvider | None = None,
    ) -> None:
        self.symbol = symbol.upper()
        self.twelve_api_key = twelve_api_key
        self.theta_api_key = theta_api_key
        self.price_ttl = price_ttl
        self.chain_ttl = chain_ttl
        self.oi_ttl = oi_ttl
        self.max_dte = max_dte
        self.strike_range = strike_range
        self.fallback = fallback or SyntheticDataProvider()
        self.lock = threading.RLock()
        self.theta_client: Any = None
        self.last_price = 0.0
        self.price_updated = 0.0
        self.price_history: deque[float] = deque(maxlen=60)
        self.chain: list[dict[str, Any]] = []
        self.chain_updated = 0.0
        self.open_interest: dict[tuple[str, float, str], int] = {}
        self.oi_updated = 0.0
        self.market_micro: dict[str, Any] = {}
        self.expirations: list[date] = []
        self.expirations_updated = 0.0
        self.last_error: str | None = None
        self.vendor_healthy = False

    def _theta(self):
        if self.theta_client is None:
            from thetadata import ThetaClient

            self.theta_client = ThetaClient(api_key=self.theta_api_key)
        return self.theta_client

    def diagnostics(self) -> dict[str, Any]:
        with self.lock:
            return {
                "source": self.source_name,
                "symbol": self.symbol,
                "healthy": self.vendor_healthy,
                "fallback": not self.vendor_healthy,
                "last_error": self.last_error,
                "price_age_seconds": round(time.monotonic() - self.price_updated, 1)
                if self.price_updated else None,
                "chain_age_seconds": round(time.monotonic() - self.chain_updated, 1)
                if self.chain_updated else None,
                "contracts": len(self.chain),
            }

    def _fetch_price(self) -> float:
        now = time.monotonic()
        if self.last_price and now - self.price_updated < self.price_ttl:
            return self.last_price
        url = "https://api.twelvedata.com/price?" + urlencode({"symbol": self.symbol})
        request = Request(
            url,
            headers={
                "Authorization": f"apikey {self.twelve_api_key}",
                "Accept": "application/json",
                "User-Agent": "AxiomFlow/1.0",
            },
        )
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
        if payload.get("status") == "error":
            raise RuntimeError(payload.get("message", "Twelve Data request failed"))
        price = _number(payload.get("price"))
        if price <= 0:
            raise ValueError("Twelve Data returned an invalid price")
        self.last_price, self.price_updated = price, now
        self.price_history.append(price)
        return price

    def _active_expirations(self) -> list[date]:
        now = time.monotonic()
        if self.expirations and now - self.expirations_updated < 3600:
            return self.expirations
        rows = _records(self._theta().option_list_expirations(symbol=self.symbol))
        today = date.today()
        expirations: list[date] = []
        for row in rows:
            value = row.get("expiration")
            if isinstance(value, str):
                value = date.fromisoformat(value[:10])
            if isinstance(value, date) and 0 <= (value - today).days <= self.max_dte:
                expirations.append(value)
        self.expirations = sorted(set(expirations))
        self.expirations_updated = now
        if not self.expirations:
            raise RuntimeError(
                f"ThetaData returned no {self.symbol} expirations within {self.max_dte} DTE"
            )
        return self.expirations

    def _refresh_open_interest(self, expirations: list[date]) -> None:
        now = time.monotonic()
        if self.open_interest and now - self.oi_updated < self.oi_ttl:
            return
        rows: list[dict[str, Any]] = []
        for expiration in expirations:
            rows.extend(_records(self._theta().option_snapshot_open_interest(
                symbol=self.symbol, expiration=expiration,
                strike_range=self.strike_range,
            )))
        self.open_interest = {
            _contract_key(row): int(_number(row.get("open_interest")))
            for row in rows
        }
        self.oi_updated = now

    def _refresh_chain(self, spot: float) -> None:
        now = time.monotonic()
        if self.chain and now - self.chain_updated < self.chain_ttl:
            return
        client = self._theta()
        expirations = self._active_expirations()
        greeks: list[dict[str, Any]] = []
        quotes: list[dict[str, Any]] = []
        trades: list[dict[str, Any]] = []
        for expiration in expirations:
            greeks.extend(_records(client.option_snapshot_greeks_all(
                symbol=self.symbol, expiration=expiration,
                strike_range=self.strike_range, stock_price=spot,
            )))
            quotes.extend(_records(client.option_snapshot_quote(
                symbol=self.symbol, expiration=expiration,
                strike_range=self.strike_range,
            )))
            trades.extend(_records(client.option_snapshot_trade(
                symbol=self.symbol, expiration=expiration,
                strike_range=self.strike_range,
            )))
        self._refresh_open_interest(expirations)
        quote_map = {_contract_key(row): row for row in quotes}
        trade_map = {_contract_key(row): row for row in trades}
        chain: list[dict[str, Any]] = []
        for row in greeks:
            key = _contract_key(row)
            expiry, strike, right = key
            quote = quote_map.get(key, row)
            item = {
                "expiry": expiry, "strike": strike,
                "type": "call" if right in {"call", "c"} else "put",
                "open_interest": self.open_interest.get(key, 0),
                "bid": _number(quote.get("bid", row.get("bid"))),
                "ask": _number(quote.get("ask", row.get("ask"))),
                "bid_size": int(_number(quote.get("bid_size"))),
                "ask_size": int(_number(quote.get("ask_size"))),
                "trade_size": int(_number(trade_map.get(key, {}).get("size"))),
                "implied_vol": _number(row.get("implied_vol")),
            }
            item.update({name: _number(row.get(name)) for name in GREEK_FIELDS})
            # Dealer-positioning convention: calls positive GEX, puts negative GEX.
            if item["type"] == "put":
                item["gamma"] *= -1
            chain.append(item)
        if not chain:
            raise RuntimeError("ThetaData returned an empty live Greeks snapshot")
        self.chain = chain
        self.chain_updated = now
        self.market_micro = self._micro_from_chain(chain, spot)

    @staticmethod
    def _micro_from_chain(chain: list[dict[str, Any]], spot: float) -> dict[str, Any]:
        liquid = sorted(chain, key=lambda row: abs(row["strike"] - spot))[:40]
        bid_size = sum(row["bid_size"] for row in liquid) or 1
        ask_size = sum(row["ask_size"] for row in liquid) or 1
        valid_quotes = [row for row in liquid if row["ask"] >= row["bid"] > 0]
        spreads = [row["ask"] - row["bid"] for row in valid_quotes]
        trade_sizes = [row["trade_size"] for row in liquid if row["trade_size"] > 0]
        iv_by_expiry: dict[str, list[float]] = {}
        for row in chain:
            if row["implied_vol"] > 0:
                iv_by_expiry.setdefault(row["expiry"], []).append(row["implied_vol"])
        term = [
            {"expiry": expiry, "iv": round(statistics.median(values), 4)}
            for expiry, values in sorted(iv_by_expiry.items())[:8]
        ]
        iv_values = [point["iv"] for point in term]
        return {
            "bid_size": bid_size, "ask_size": ask_size,
            "spread": statistics.median(spreads) if spreads else 0.01,
            "trade_size": max(trade_sizes, default=0),
            "average_trade_size": statistics.mean(trade_sizes) if trade_sizes else 1,
            "tape_speed": len(trade_sizes),
            "term_structure": term,
            "iv_slope": (iv_values[-1] - iv_values[0]) if len(iv_values) > 1 else 0,
            "vol_of_vol": statistics.pstdev(iv_values) if len(iv_values) > 1 else 0,
        }

    def snapshot(self) -> dict[str, Any]:
        try:
            with self.lock:
                spot = self._fetch_price()
                self._refresh_chain(spot)
                history = list(self.price_history)
                returns = [
                    (current - previous) / previous
                    for previous, current in zip(history, history[1:]) if previous
                ]
                price_trend = (history[-1] - history[0]) / history[0] if len(history) > 1 else 0
                realized = statistics.pstdev(returns) * 100 if len(returns) > 1 else 0.2
                micro = self.market_micro
                spread = max(_number(micro.get("spread"), 0.01), 0.01)
                self.vendor_healthy, self.last_error = True, None
                return {
                    "symbol": self.symbol, "data_source": self.source_name, "spot": spot,
                    "price_trend": max(-1, min(1, price_trend * 100)),
                    "volatility": max(0, min(1, realized)),
                    "compression": max(0, min(1, 1 - realized)),
                    "reversal_pressure": max(0, min(1, abs(price_trend) * 50)),
                    "bid": spot - spread / 2, "ask": spot + spread / 2,
                    "bid_size": micro.get("bid_size", 1), "ask_size": micro.get("ask_size", 1),
                    "tick_size": 0.01, "trade_size": micro.get("trade_size", 0),
                    "average_trade_size": micro.get("average_trade_size", 1),
                    "tape_speed": micro.get("tape_speed", 0),
                    "iv_slope": micro.get("iv_slope", 0),
                    "vol_of_vol": micro.get("vol_of_vol", 0),
                    "term_structure": micro.get("term_structure", []),
                }
        except Exception as exc:
            logger.exception("Vendor data refresh failed; using synthetic fallback")
            with self.lock:
                self.vendor_healthy, self.last_error = False, str(exc)
            fallback = self.fallback.snapshot()
            fallback.update({"symbol": self.symbol, "data_source": "synthetic-fallback"})
            return fallback

    def option_chain(self, spot: float) -> list[dict[str, Any]]:
        with self.lock:
            if self.vendor_healthy and self.chain:
                return [dict(row) for row in self.chain]
        return self.fallback.option_chain(spot)
