from flask import Blueprint, current_app, jsonify, request

bp = Blueprint("alerts", __name__, url_prefix="/api/alerts")


@bp.get("")
def list_alerts():
    limit = min(max(request.args.get("limit", 50, type=int), 1), 100)
    return jsonify(current_app.extensions["streams"].get_alerts()[:limit])

