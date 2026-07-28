from __future__ import annotations

import math
import random
from datetime import date, timedelta


class SyntheticDataProvider:
    """Deterministic market-like feed used until a real provider is connected."""

    def __init__(self, seed: int = 41) -> None:
        self.random = random.Random(seed)
        self.tick = 0
        self.spot = 524.0

    def snapshot(self) -> dict:
        self.tick += 1
        wave = math.sin(self.tick / 8)
        self.spot += self.random.uniform(-0.35, 0.35) + wave * 0.035
        tick_size = 0.01
        spread = self.random.choice([0.01, 0.01, 0.02])
        bid = round(self.spot - spread / 2, 3)
        ask = round(self.spot + spread / 2, 3)
        bid_size = self.random.randint(300, 1500)
        ask_size = self.random.randint(300, 1500)
        average_size = self.random.randint(80, 180)
        return {
            "spot": round(self.spot, 3),
            "price_trend": math.sin(self.tick / 17),
            "volatility": (math.sin(self.tick / 13) + 1) / 2,
            "compression": (math.cos(self.tick / 11) + 1) / 2,
            "reversal_pressure": (math.sin(self.tick / 19 + 2) + 1) / 2,
            "bid": bid,
            "ask": ask,
            "bid_size": bid_size,
            "ask_size": ask_size,
            "tick_size": tick_size,
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

    def option_chain(self, spot: float) -> list[dict]:
        rows = []
        base = round(spot / 5) * 5
        for days in [7, 30, 60]:
            expiry = (date.today() + timedelta(days=days)).isoformat()
            for strike in range(base - 30, base + 35, 5):
                distance = (strike - spot) / max(spot * 0.18 * math.sqrt(days / 365), 1)
                density = math.exp(-(distance**2) / 2)
                for option_type in ["call", "put"]:
                    side = 1 if option_type == "call" else -1
                    delta = side * (0.5 - 0.35 * math.tanh(distance))
                    gamma = density * 0.018 * (1 if strike >= base - 5 else -0.7)
                    rows.append(
                        {
                            "expiry": expiry,
                            "strike": strike,
                            "type": option_type,
                            "open_interest": int(400 + density * 5200 + self.random.randint(0, 500)),
                            "gamma": gamma,
                            "delta": delta,
                            "vega": density * 0.16,
                            "theta": -density * 0.075,
                            "rho": side * density * 0.04,
                            "vanna": -side * distance * density * 0.05,
                            "charm": side * distance * density * 0.035,
                            "vomma": density * (1 + abs(distance)) * 0.08,
                            "veta": -density * 0.045,
                            "speed": -distance * density * 0.012,
                            "zomma": density * (distance**2 - 1) * 0.014,
                            "color": -density * 0.011,
                        }
                    )
        return rows

