from datetime import datetime

from db import execute, get_first
from flask import Flask, Response, request

app = Flask(__name__)


def getUserId():
    try:
        header = request.headers["Authorization"]
        return header.split()[1]
    except:
        return None


@app.route("/", methods=["POST"])
def register():
    try:
        id = request.json["token"]
        execute("insert into users(id, enabled) values(%s, true)", (id,))
        return "", 201
    except:
        return "", 400


@app.route("/me", methods=["POST"])
def track():
    try:
        execute(
            "insert into logins(id, info, time) values(%s, %s, %s)",
            (getUserId(), request.user_agent.string, datetime.now()),
        )
        return "", 204
    except:
        return "", 400


@app.route("/me/root", methods=["PUT"])
def set_root():
    try:
        root_id = request.json["root_id"]
        execute(
            "insert into latest(id, userID, timestamp) values(%s, %s, %s)",
            (root_id, getUserId(), datetime.now()),
        )
        return "", 201
    except Exception as e:
        return str(e), 400


@app.route("/me/root", methods=["GET"])
def get_root():
    try:
        print(f"get root")
        result = get_first(
            "select id from latest where userID = %s order by timestamp desc",
            (getUserId(),),
        )
        if result is None:
            return "", 404
        return result[0], 200
    except Exception as e:
        return str(e), 400


@app.route("/me/<string:id>", methods=["POST"])
def create(id):
    try:
        payload = request.json["data"]
        execute(
            "insert into objects(id, userID, serialized) values(%s, %s, %s)",
            (id, getUserId(), payload),
        )
        return "", 201
    except:
        return "", 400


@app.route("/me/<string:id>", methods=["GET"])
def read(id):
    try:
        result = get_first(
            "select serialized from objects where userID = %s and id = %s",
            (getUserId(), id),
        )
        if result is None:
            return "", 404
        return result[0], 200
    except:
        return "", 400


@app.after_request
def postprocess(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
    response.headers[
        "Access-Control-Allow-Headers"
    ] = "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With"
    return response


if __name__ == "__main__":
    app.run(host="0.0.0.0")
