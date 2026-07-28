from dotenv import load_dotenv

load_dotenv()

from flask import Flask
from flask_cors import CORS

from app.config import Config
from app.routes import BLUEPRINTS
from app.services import StreamManager, SyntheticDataProvider
from app.supabase_client import Repository


def create_app(config_object=Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object)
    CORS(app, origins=app.config["CORS_ORIGINS"])
    repository = Repository(app.config["SUPABASE_URL"], app.config["SUPABASE_KEY"])
    app.extensions["streams"] = StreamManager(
        SyntheticDataProvider(), repository, app.config["STREAM_INTERVAL"]
    )
    for blueprint in BLUEPRINTS:
        app.register_blueprint(blueprint)

    @app.get("/health")
    def health():
        return {"status": "ok", "persistence": repository.enabled}

    return app


app = create_app()

