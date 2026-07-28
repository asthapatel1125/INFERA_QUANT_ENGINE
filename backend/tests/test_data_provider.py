from datetime import date

from app.services.data_provider import VendorDataProvider, _records


class FakeFrame:
    def __init__(self, rows):
        self.rows = rows

    def to_dicts(self):
        return self.rows


class FakeTheta:
    def option_snapshot_greeks_all(self, **kwargs):
        return FakeFrame([{
            "expiration": date(2026, 8, 21), "strike": 550, "right": "call",
            "bid": 5.0, "ask": 5.1, "gamma": .02, "delta": .52, "vega": .1,
            "theta": -.03, "rho": .01, "vanna": .02, "charm": .01,
            "vomma": .03, "veta": -.01, "speed": .001, "zomma": .002,
            "color": -.001, "implied_vol": .22,
        }])

    def option_snapshot_quote(self, **kwargs):
        return FakeFrame([{
            "expiration": date(2026, 8, 21), "strike": 550, "right": "call",
            "bid": 5.0, "ask": 5.1, "bid_size": 25, "ask_size": 20,
        }])

    def option_snapshot_trade(self, **kwargs):
        return FakeFrame([{
            "expiration": date(2026, 8, 21), "strike": 550, "right": "call",
            "size": 10,
        }])

    def option_snapshot_open_interest(self, **kwargs):
        return FakeFrame([{
            "expiration": date(2026, 8, 21), "strike": 550, "right": "call",
            "open_interest": 1000,
        }])


class FakeResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {"price": "550.25"}


class FakeHttp:
    pass


def test_records_accepts_polars_shape():
    assert _records(FakeFrame([{"x": 1}])) == [{"x": 1}]


def test_vendor_provider_merges_theta_snapshots(monkeypatch):
    provider = VendorDataProvider("QQQ", "twelve", "theta")
    provider.theta_client = FakeTheta()
    monkeypatch.setattr(provider, "_fetch_price", lambda: 550.25)

    snapshot = provider.snapshot()
    chain = provider.option_chain(snapshot["spot"])

    assert snapshot["spot"] == 550.25
    assert snapshot["data_source"] == "twelvedata+thetadata"
    assert chain[0]["open_interest"] == 1000
    assert chain[0]["bid_size"] == 25
    assert chain[0]["gamma"] == .02
