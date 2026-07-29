from __future__ import annotations

from collections import defaultdict
from statistics import pstdev
from typing import Any

from app.utils.banding import band_score, strength_band
from app.utils.normalization import normalize_greeks
from app.utils.scoring import clamp

GREEKS = ["gamma", "delta", "vega", "theta", "rho", "vanna", "charm", "vomma", "veta", "speed", "zomma", "color"]
EXPOSURE_MAP = {"gamma": "gex", "delta": "dex", "vega": "vex", "theta": "tex", "rho": "rex"}


class GreekEngine:
    def __init__(self) -> None:
        self.previous_averages: dict[str, float] = {}

    def compute(self, chain: list[dict[str, Any]], spot: float) -> dict[str, Any]:
        normalized = normalize_greeks(chain, GREEKS)
        curves: dict[float, dict[str, float]] = defaultdict(lambda: {value: 0.0 for value in EXPOSURE_MAP.values()})
        calls: dict[float, float] = defaultdict(float)
        puts: dict[float, float] = defaultdict(float)
        totals = {value: 0.0 for value in EXPOSURE_MAP.values()}

        for row in chain:
            strike, oi = float(row["strike"]), float(row["open_interest"])
            for greek, label in EXPOSURE_MAP.items():
                exposure = float(row[greek]) * oi * 100
                curves[strike][label] += exposure
                totals[label] += exposure
            gamma_exposure = float(row["gamma"]) * oi * 100
            (calls if row["type"] == "call" else puts)[strike] += gamma_exposure

        ordered = sorted(curves.items())
        flips = []
        for (left_strike, left), (right_strike, right) in zip(ordered, ordered[1:]):
            if left["gex"] == 0 or left["gex"] * right["gex"] < 0:
                flips.append((left_strike, right_strike))
        nearest_flip = min(flips, key=lambda interval: abs(sum(interval) / 2 - spot)) if flips else (spot, spot)

        averages = {
            name: sum(abs(row["normalized"][name]) for row in normalized) / max(len(normalized), 1)
            for name in GREEKS
        }
        signed_averages = {
            name: sum(row["normalized"][name] for row in normalized) / max(len(normalized), 1)
            for name in GREEKS
        }
        below_gamma = [float(row["gamma"]) for row in chain if float(row["strike"]) < spot]
        above_gamma = [float(row["gamma"]) for row in chain if float(row["strike"]) >= spot]
        gamma_slope = (
            sum(above_gamma) / max(len(above_gamma), 1)
            - sum(below_gamma) / max(len(below_gamma), 1)
        )
        drifts = {
            name: signed_averages[name] - self.previous_averages.get(name, signed_averages[name])
            for name in ("vanna", "charm")
        }
        stability_details = {
            name: clamp(1 - pstdev([row["normalized"][name] for row in normalized]))
            for name in ("speed", "zomma", "color")
        }
        self.previous_averages = signed_averages
        instability = sum(pstdev([row["normalized"][name] for row in normalized]) for name in ["speed", "zomma", "color"]) / 3
        curve_list = [{"strike": strike, **{key: round(value, 2) for key, value in values.items()}} for strike, values in ordered]
        return {
            "spot": spot,
            "totals": {key: round(value, 2) for key, value in totals.items()},
            "curve": curve_list,
            "call_wall": max(calls, key=calls.get) if calls else None,
            "put_wall": min(puts, key=puts.get) if puts else None,
            "gamma_flip_lower": nearest_flip[0],
            "gamma_flip_upper": nearest_flip[1],
            "long_gamma_zones": [row["strike"] for row in curve_list if row["gex"] > 0],
            "short_gamma_zones": [row["strike"] for row in curve_list if row["gex"] < 0],
            "greek_stability": round(clamp(1 - instability), 3),
            "direction_sign": 1 if totals["dex"] >= 0 else -1,
            "band_scores": {name: round(band_score(value), 3) for name, value in averages.items()},
            "bands": {name: strength_band(value) for name, value in averages.items()},
            "regime_details": {
                "gamma_slope": round(gamma_slope, 5),
                "vanna_drift": round(drifts["vanna"], 5),
                "charm_drift": round(drifts["charm"], 5),
                "speed_stability": round(stability_details["speed"], 3),
                "zomma_stability": round(stability_details["zomma"], 3),
                "color_stability": round(stability_details["color"], 3),
            },
        }
