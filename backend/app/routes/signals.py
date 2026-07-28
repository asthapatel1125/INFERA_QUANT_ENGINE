from flask import Blueprint
from .common import snapshot

bp = Blueprint("signals", __name__, url_prefix="/api/signals")


@bp.get("")
def current_signals():
    return snapshot("scores")

