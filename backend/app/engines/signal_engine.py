from app.utils.scoring import clamp, weighted_mean


class SignalEngine:
    def compute(self, greek: dict, micro: dict) -> dict:
        bands = greek["band_scores"]
        # Spec weights total 1.4 and 1.3 respectively; normalize to preserve score ranges.
        direction = weighted_mean(
            [
                (greek["direction_sign"] * bands["delta"], 0.6),
                (greek["direction_sign"] * bands["vanna"], 0.2),
                (greek["direction_sign"] * bands["charm"], 0.2),
                (micro["quote_imbalance"], 0.4),
            ]
        )
        explosion = weighted_mean(
            [(bands["vomma"], 0.4), (bands["veta"], 0.3), (bands["vega"], 0.3), (bands["gamma"], 0.3)]
        )
        precision = (
            0.4 * greek["greek_stability"]
            + 0.3 * micro["micro_stability"]
            + 0.3 * micro["liquidity_score"]
        )
        return {
            "direction_score": round(clamp(direction, -1, 1), 3),
            "explosion_score": round(clamp(explosion), 3),
            "precision_score": round(clamp(precision), 3),
        }

