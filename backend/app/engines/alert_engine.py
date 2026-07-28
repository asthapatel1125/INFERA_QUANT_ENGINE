class AlertEngine:
    def compute(self, zone: dict, scores: dict, micro: dict) -> dict:
        direction_score = scores["direction_score"]
        direction = "LONG" if direction_score >= 0 else "SHORT"
        aligned = (
            micro["quote_imbalance"] > 0 if direction == "LONG" else micro["quote_imbalance"] < 0
        )
        active = (
            zone["stability"] >= 0.5
            and scores["precision_score"] >= 0.6
            and abs(direction_score) >= 0.4
            and aligned
        )
        tier = (
            "TIER_1"
            if active and scores["precision_score"] >= 0.8 and abs(direction_score) >= 0.7
            else "TIER_2"
            if active
            else None
        )
        return {
            "active": active,
            "tier": tier,
            "direction": direction if active else None,
            "zone": zone["zone"],
            "precision": scores["precision_score"],
            "explosion": scores["explosion_score"],
            "direction_score": direction_score,
            "micro_confirmed": aligned,
        }

