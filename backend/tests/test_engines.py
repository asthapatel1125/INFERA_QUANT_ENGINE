from app.engines.alert_engine import AlertEngine
from app.engines.micro_engine import MicrostructureEngine
from app.engines.zone_engine import ZoneEngine
from app.utils.banding import strength_band


def test_strength_bands_use_absolute_value():
    assert strength_band(-0.81) == "Strongest"
    assert strength_band(0.19) == "Weakest"


def test_microstructure_formulas():
    result = MicrostructureEngine().compute({
        "bid": 100, "ask": 100.01, "bid_size": 600, "ask_size": 400,
        "tick_size": 0.01, "trade_size": 301, "average_trade_size": 100,
    })
    assert result["quote_imbalance"] == 0.2
    assert result["microprice"] == 100.006
    assert result["sweep_detected"] is True


def test_zone_requires_three_samples_to_change():
    engine = ZoneEngine()
    data = {"volatility": .8, "compression": .1, "price_trend": .1, "liquidity": .8,
            "micro_stability": .8, "reversal_pressure": .1}
    assert engine.compute(data, "1")["stable_zone"] == "DEAD"
    assert engine.compute(data, "2")["stable_zone"] == "DEAD"
    assert engine.compute(data, "3")["stable_zone"] == "EXPANSION"


def test_tier_one_alert():
    alert = AlertEngine().compute(
        {"zone": "TREND", "stability": .9},
        {"direction_score": .8, "precision_score": .85, "explosion_score": .7},
        {"quote_imbalance": .3},
    )
    assert alert["active"] and alert["tier"] == "TIER_1"

