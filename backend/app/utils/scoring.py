def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return min(high, max(low, value))


def weighted_mean(parts: list[tuple[float, float]]) -> float:
    total = sum(weight for _, weight in parts)
    return sum(value * weight for value, weight in parts) / total if total else 0.0

