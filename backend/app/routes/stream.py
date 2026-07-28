from flask import Blueprint, Response, current_app

bp = Blueprint("stream", __name__, url_prefix="/stream")
CHANNELS = {"zones", "exposures", "micro", "scores", "alerts"}


@bp.get("/<channel>")
def stream(channel: str):
    if channel not in CHANNELS:
        return {"error": "unknown stream"}, 404
    response = Response(
        current_app.extensions["streams"].event_stream(channel),
        content_type="text/event-stream",
    )
    response.headers["Cache-Control"] = "no-cache, no-transform"
    response.headers["X-Accel-Buffering"] = "no"
    return response

