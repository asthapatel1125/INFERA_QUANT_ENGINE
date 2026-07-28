from collections import defaultdict
from typing import Any


def normalize_greeks(rows: list[dict[str, Any]], names: list[str]) -> list[dict[str, Any]]:
    maxima: dict[tuple[str, str], float] = defaultdict(float)
    for row in rows:
        expiry = str(row["expiry"])
        for name in names:
            maxima[(expiry, name)] = max(maxima[(expiry, name)], abs(float(row.get(name, 0))))

    normalized = []
    for row in rows:
        item = dict(row)
        expiry = str(row["expiry"])
        item["normalized"] = {
            name: (float(row.get(name, 0)) / maxima[(expiry, name)])
            if maxima[(expiry, name)]
            else 0.0
            for name in names
        }
        normalized.append(item)
    return normalized

