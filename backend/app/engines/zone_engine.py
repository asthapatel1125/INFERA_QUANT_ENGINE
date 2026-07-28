from __future__ import annotations

from collections import deque
from typing import Any


class ZoneEngine:
    def __init__(self, minimum_samples: int = 3) -> None:
        self.minimum_samples = minimum_samples
        self.current_zone = "DEAD"
        self.candidate = "DEAD"
        self.candidate_count = 0
        self.stability = 0.0
        self.history: deque[dict[str, Any]] = deque(maxlen=120)

    @staticmethod
    def classify(data: dict[str, float]) -> str:
        volatility = data["volatility"]
        compression = data["compression"]
        trend = abs(data["price_trend"])
        liquidity = data["liquidity"]
        micro = data["micro_stability"]
        if liquidity < 0.22 or micro < 0.2:
            return "DEAD"
        if compression > 0.72:
            return "COMPRESSION"
        if volatility > 0.7:
            return "EXPANSION"
        if trend > 0.62 and micro > 0.45:
            return "TREND"
        if data["reversal_pressure"] > 0.67:
            return "REVERSAL"
        return "COMPRESSION" if volatility < 0.42 else "TREND"

    def compute(self, data: dict[str, float], timestamp: str) -> dict[str, Any]:
        proposed = self.classify(data)
        if proposed == self.candidate:
            self.candidate_count += 1
        else:
            self.candidate, self.candidate_count = proposed, 1

        changed = False
        if proposed == self.current_zone:
            self.stability = min(1.0, self.stability + 0.12)
        elif self.candidate_count >= self.minimum_samples and self.stability < 0.4:
            self.current_zone, changed, self.stability = proposed, True, 0.42
        else:
            self.stability = max(0.0, self.stability - 0.16)

        transitional = proposed != self.current_zone
        display_zone = (
            f"PRE_{proposed}"
            if transitional and proposed in {"TREND", "REVERSAL"}
            else self.current_zone
        )
        snapshot = {
            "timestamp": timestamp,
            "zone": display_zone,
            "stable_zone": self.current_zone,
            "stability": round(self.stability, 3),
            "transition_flag": transitional or changed,
            "candidate_samples": self.candidate_count,
        }
        self.history.append(snapshot)
        return snapshot

