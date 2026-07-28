from flask import Blueprint
from .common import snapshot

bp = Blueprint("micro", __name__, url_prefix="/api/micro")


@bp.get("")
def current_micro():
    return snapshot("micro")

