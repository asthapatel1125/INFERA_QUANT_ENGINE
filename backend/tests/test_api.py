from app import create_app


class TestConfig:
    TESTING = True
    SUPABASE_URL = ""
    SUPABASE_KEY = ""
    STREAM_INTERVAL = 60
    CORS_ORIGINS = ["*"]
    MARKET_SYMBOL = "QQQ"
    DATA_PROVIDER = "synthetic"
    TWELVEDATA_API_KEY = ""
    TWELVEDATA_PRICE_TTL = 60
    THETADATA_API_KEY = ""
    THETADATA_MAX_DTE = 90
    THETADATA_STRIKE_RANGE = 30
    THETADATA_CHAIN_TTL = 15
    THETADATA_OI_TTL = 900


def test_health_and_snapshots():
    client = create_app(TestConfig).test_client()
    assert client.get("/health").status_code == 200
    assert client.get("/health").get_json()["market_data"]["source"] == "synthetic"
    response = client.get("/api/zones")
    assert response.status_code == 200
    assert "stability" in response.get_json()
