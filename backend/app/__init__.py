from dotenv import load_dotenv

load_dotenv()

from flask import Flask
from flask_cors import CORS

from app.config import Config
from app.routes import BLUEPRINTS
from app.services import (
    StreamManager,
    SyntheticDataProvider,
    VendorDataProvider,
)
from app.supabase_client import Repository


def create_app(config_object=Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object)

    CORS(
        app,
        origins=app.config["CORS_ORIGINS"],
    )

    repository = Repository(
        app.config["SUPABASE_URL"],
        app.config["SUPABASE_KEY"],
    )

    live_configured = bool(
        app.config["TWELVEDATA_API_KEY"]
        and app.config["THETADATA_API_KEY"]
    )

    use_live = (
        app.config["DATA_PROVIDER"] == "live"
        or (
            app.config["DATA_PROVIDER"] == "auto"
            and live_configured
        )
    )

    if use_live:
        provider = VendorDataProvider(
            symbol=app.config["MARKET_SYMBOL"],
            twelve_api_key=app.config["TWELVEDATA_API_KEY"],
            theta_api_key=app.config["THETADATA_API_KEY"],
            price_ttl=app.config["TWELVEDATA_PRICE_TTL"],
            chain_ttl=app.config["THETADATA_CHAIN_TTL"],
            oi_ttl=app.config["THETADATA_OI_TTL"],
            max_dte=app.config["THETADATA_MAX_DTE"],
            strike_range=app.config["THETADATA_STRIKE_RANGE"],
        )
    else:
        provider = SyntheticDataProvider()

    stream_manager = StreamManager(
        provider,
        repository,
        app.config["STREAM_INTERVAL"],
    )

    app.extensions["streams"] = stream_manager

    for blueprint in BLUEPRINTS:
        app.register_blueprint(blueprint)

    @app.get("/health")
    def health():
        return {
            "status": "ok",
            "persistence": repository.enabled,
            "market_data": provider.diagnostics(),
            "stream": stream_manager.diagnostics(),
        }

    return app


app = create_app()