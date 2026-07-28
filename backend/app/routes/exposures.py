from flask import Blueprint
from .common import snapshot

bp = Blueprint("exposures", __name__, url_prefix="/api/exposures")


@bp.get("")
def current_exposures():
    return snapshot("exposures")

