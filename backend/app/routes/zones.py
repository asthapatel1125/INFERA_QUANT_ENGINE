from flask import Blueprint
from .common import snapshot

bp = Blueprint("zones", __name__, url_prefix="/api/zones")


@bp.get("")
def current_zone():
    return snapshot("zones")

