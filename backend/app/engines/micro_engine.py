from app.utils.scoring import clamp, weighted_mean


class MicrostructureEngine:
    def compute(self, data: dict) -> dict:
        bid, ask = float(data["bid"]), float(data["ask"])
        bid_size, ask_size = float(data["bid_size"]), float(data["ask_size"])
        total_size = bid_size + ask_size
        imbalance = (bid_size - ask_size) / total_size if total_size else 0.0
        microprice = (bid * ask_size + ask * bid_size) / total_size if total_size else (bid + ask) / 2
        spread_ticks = (ask - bid) / max(float(data.get("tick_size", 0.01)), 1e-9)
        spread_regime = "TIGHT" if spread_ticks < 0.25 else "WIDE" if spread_ticks > 1 else "NORMAL"
        sweep = float(data["trade_size"]) > 3 * max(float(data["average_trade_size"]), 1)
        depth_score = clamp(total_size / 2200)
        spread_score = clamp(1 - spread_ticks / 4)
        liquidity = weighted_mean([(depth_score, 0.55), (spread_score, 0.45)])
        stability = weighted_mean(
            [(1 - abs(imbalance), 0.35), (liquidity, 0.45), (0.0 if sweep else 1.0, 0.2)]
        )
        return {
            "quote_imbalance": round(imbalance, 4),
            "microprice": round(microprice, 4),
            "midprice": round((bid + ask) / 2, 4),
            "spread": round(ask - bid, 4),
            "spread_regime": spread_regime,
            "sweep_detected": sweep,
            "liquidity_score": round(liquidity, 3),
            "micro_stability": round(stability, 3),
            "tape_speed": round(float(data.get("tape_speed", 0)), 2),
            "iv_slope": round(float(data.get("iv_slope", 0)), 4),
            "vol_of_vol": round(float(data.get("vol_of_vol", 0)), 4),
            "term_structure": data.get("term_structure", []),
        }

