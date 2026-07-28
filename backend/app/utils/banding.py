def strength_band(value: float) -> str:
    magnitude = abs(value)
    if magnitude >= 0.8:
        return "Strongest"
    if magnitude >= 0.6:
        return "Strong"
    if magnitude >= 0.4:
        return "Neutral"
    if magnitude >= 0.2:
        return "Weak"
    return "Weakest"


def band_score(value: float) -> float:
    return min(1.0, max(0.0, abs(value)))

