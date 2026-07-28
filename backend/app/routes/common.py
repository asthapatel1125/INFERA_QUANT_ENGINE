from flask import current_app, jsonify


def snapshot(channel: str):
    return jsonify(current_app.extensions["streams"].get(channel))

