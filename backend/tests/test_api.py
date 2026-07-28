from app import create_app


class TestConfig:
    TESTING = True
    SUPABASE_URL = ""
    SUPABASE_KEY = ""
    STREAM_INTERVAL = 60
    CORS_ORIGINS = ["*"]


def test_health_and_snapshots():
    client = create_app(TestConfig).test_client()
    assert client.get("/health").status_code == 200
    response = client.get("/api/zones")
    assert response.status_code == 200
    assert "stability" in response.get_json()

