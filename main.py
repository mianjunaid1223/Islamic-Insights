import os
from dotenv import load_dotenv
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import google.generativeai as genai
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId
import datetime
import secrets
import smtplib
from email.mime.text import MIMEText

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_GENAI_API_KEY"))

app = Flask(__name__, template_folder="template",static_folder='static')
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY")
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
app.config["PERMANENT_SESSION_LIFETIME"] = datetime.timedelta(days=int(os.getenv("SESSION_LIFETIME_DAYS")))

client = MongoClient(os.getenv("MONGO_URI"))

db = client["islamic_chatbot"]
users = db["users"]
chats = db["chats"]


def ask(question, history: list) -> list:
    generation_config = {
        "temperature": 1,
        "top_p": 0.95,
        "top_k": 64,
        "max_output_tokens": 600,
        "response_mime_type": "text/plain",
    }

    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        generation_config=generation_config,
        safety_settings={
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
        system_instruction="""ADD_YOUR_OWN_SYSTEM_INSTRUCTIINS
        
""",
    )

    chat_session = model.start_chat(history=history)
    answer: dict = dict()
    try:
        answer = chat_session.send_message(question).text
    except Exception as e:
        if "finish_reason: SAFETY" in str(e):
            answer = "I’m sorry, but I’m unable to assist with that request out of respect for religious beliefs. If there’s anything else you’d like to ask, I’m here to help."
    return answer


def send_email(sender_email, receiver_email, subject, body, password):
    message = MIMEText(body)
    message["Subject"] = subject
    message["From"] = sender_email
    message["To"] = receiver_email

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(sender_email, password)
        server.sendmail(sender_email, receiver_email, message.as_string())


@app.route("/")
def index():
    if "user_id" in session:
        user = users.find_one({"_id": ObjectId(session["user_id"])})
        if user and user["verified"]:
            return render_template(
                "index.html", email=user["username"], name=user["name"]
            )
        elif user and not user["verified"]:
            return redirect(url_for("verify_email"))

    return redirect(url_for("welcome"))

@app.route('/welcome')
def welcome():
    if "user_id" in session:
        user = users.find_one({"_id": ObjectId(session["user_id"])})
        if user and user["verified"]:
            return redirect(url_for("index"))
        elif user and not user["verified"]:
            return redirect(url_for("verify_email"))
    return render_template('landing.html')

@app.route("/signup", methods=["GET", "POST"])
def signup():
    if "user_id" in session:
        user = users.find_one({"_id": ObjectId(session["user_id"])})
        if user and user["verified"]:
            return redirect(url_for("index"))
        elif user and not user["verified"]:
            return redirect(url_for("verify_email"))
    if request.method == "POST":
        name = request.json.get("name")
        username = request.json.get("username")
        password = request.json.get("password")

        if users.find_one({"username": username}):
            return redirect(url_for("signup"))
        hashed_password = generate_password_hash(password)
        verification_code = secrets.randbelow(1000000)  # Generate a 6-digit code

        user_id = users.insert_one(
            {
                "name": name,
                "username": username,
                "password": hashed_password,
                "verified": False,
                "verification_code": verification_code,
                "verification_expiry": datetime.datetime.now()
                + datetime.timedelta(hours=24),
            }
        ).inserted_id

        sender_email = os.getenv('EMAIL')
        receiver_email = username
        password = os.getenv('PS')
        subject = "Vrify your email"
        body = f"Your verification code is: {verification_code}"

        send_email(sender_email, receiver_email, subject, body, password)

        session.permanent = True
        session["user_id"] = str(user_id)
        return {"success": True}

    return render_template("signup.html")


@app.route("/verify-email", methods=["GET", "POST"])
def verify_email():
    if "user_id" not in session:
        return redirect(url_for("welcome"))

    user = users.find_one({"_id": ObjectId(session["user_id"])})
    if not user or user["verified"]:
        return redirect(url_for("index"))

    if request.method == "POST":
        entered_code = request.json.get("verification_code")
        if (
            int(entered_code) == user["verification_code"]
            and datetime.datetime.now() < user["verification_expiry"]
        ):
            users.update_one(
                {"_id": user["_id"]},
                {
                    "$set": {"verified": True},
                    "$unset": {"verification_code": "", "verification_expiry": ""},
                },
            )
            return {"success": True}
        else:
            return {"success": False, "failure": "Invalid verification code"}

    return render_template("verify_email.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if "user_id" in session:
        user = users.find_one({"_id": ObjectId(session["user_id"])})
        if user and user["verified"]:
            return redirect(url_for("index"))
        elif user and not user["verified"]:
            return redirect(url_for("verify_email"))

    if request.method == "POST":
        username = request.json.get("username")
        password = request.json.get("password")
        user = users.find_one({"username": username})

        if user and check_password_hash(user["password"], password):
            session.permanent = True
            session["user_id"] = str(user["_id"])
            return {"success": True}

        return {"success": False, "failure": "Invalid username or password"}

    return render_template("login.html")



@app.route("/logout")
def logout():
    session.pop("user_id", None)
    return redirect(url_for("welcome"))


@app.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        username = request.form.get("username")
        user = users.find_one({"username": username})
        if user:
            token = secrets.token_urlsafe(32)
            expiration = datetime.datetime.now() + datetime.timedelta(hours=1)

            users.update_one(
                {"_id": user["_id"]},
                {"$set": {"reset_token": token, "reset_expiration": expiration}},
            )

            send_reset_email(user["username"], token)

            return render_template('check.html')
        else:
            return "<h1 style='color:black; text-align: center; font-size: 50px; font-weight: bold'>User not found</h1>"

    return render_template("forgot_password.html")


@app.route("/reset-password/<token>", methods=["GET", "POST"])
def reset_password(token):
    user = users.find_one(
        {"reset_token": token, "reset_expiration": {"$gt": datetime.datetime.now()}}
    )
    if not user:
        return "Invalid or expired token"

    if request.method == "POST":
        new_password = request.form.get("new_password")
        hashed_password = new_password

        users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {"password": hashed_password},
                "$unset": {"reset_token": "", "reset_expiration": ""},
            },
        )

        return redirect(url_for("login"))

    return render_template("reset_password.html", token=token)


def send_reset_email(email, token):
    sender_email = "islamicinsightsai@gmail.com"
    receiver_email = email
    password = "hvic ecxw halo zelg"
    subject = "Reset your Password"
    body = f"Click the following link to reset your password: {url_for('reset_password', token=token, _external=True)}"

    send_email(sender_email, receiver_email, subject, body, password)


@app.route("/ask", methods=["POST"])
def ask_question():
    if "user_id" not in session:
        return jsonify({"error": "Not authenticated"}), 401

    user_id = session["user_id"]
    question = request.json["question"]
    chat_id = request.json.get("chat_id")

    history = []
    if chat_id:
        chat = chats.find_one({"_id": ObjectId(chat_id), "user_id": user_id})
        if chat:
            history = chat["messages"]

    answer = ask(question, history)

    if not chat_id:
        chat_id = str(
            chats.insert_one(
                {
                    "user_id": user_id,
                    "title": question[
                        :30
                    ],  # Use first 30 characters of question as title
                    "messages": [
                        {"role": "user", "parts": [question]},
                        {"role": "model", "parts": [answer]},
                    ],
                    "created_at": datetime.datetime.now(),
                }
            ).inserted_id
        )
    else:
        chats.update_one(
            {"_id": ObjectId(chat_id), "user_id": user_id},
            {
                "$push": {
                    "messages": {
                        "$each": [
                            {"role": "user", "parts": [question]},
                            {"role": "model", "parts": [answer]},
                        ]
                    }
                }
            },
        )

    return jsonify({"answer": answer, "chat_id": chat_id})


@app.route("/chats", methods=["GET"])
def get_chats():
    if "user_id" not in session:
        return jsonify({"error": "Not authenticated"}), 401

    user_id = session["user_id"]
    chats_list = []
    for chat in chats.find({"user_id": user_id}).sort("created_at", -1):
        chats_list.append(
            {
                "_id": str(chat["_id"]),
                "title": chat["title"],
                "last_message": (
                    chat["messages"][-1]["parts"][0] if chat["messages"] else ""
                ),
            }
        )

    return jsonify(chats_list)



@app.route("/chat", methods=["GET"])
def get_chat():
    if "user_id" not in session:
        return jsonify({"error": "Not authenticated"}), 401

    user_id = session["user_id"]
    chat_id = request.args.get("chat_id")
    here = request.args.get("here")
    if not chat_id:
        return redirect(url_for("index"))
    user = users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404
    if not user.get("verified"):
        return jsonify({"error": "User not verified"}), 403

    chat = chats.find_one({"_id": ObjectId(chat_id), "user_id": user_id})
    if not chat:
        return jsonify({"error": "Chat not found"}), 404

    messages = [
        {"content": msg["parts"][0], "role": msg["role"]} for msg in chat["messages"]
    ]

    if here == "true":
        return jsonify(messages)
    elif not here:
        return render_template(
            "index.html",
            email=user["username"],
            name=user["name"],
            here="True",
            chat_id=chat_id,
        )

    return redirect(url_for("welcome"))




@app.route("/delete_chat", methods=["POST"])
def delete_chat():
    if "user_id" not in session:
        return jsonify({"error": "Not authenticated"}), 401

    user_id = session["user_id"]
    chat_id = request.json.get("chat_id")

    result = chats.delete_one({"_id": ObjectId(chat_id), "user_id": user_id})
    if result.deleted_count == 0:
        return jsonify({"error": "Chat not found or not authorized"}), 404

    return jsonify({"success": True})


@app.route("/delete_all_chats", methods=["POST"])
def delete_all_chats():
    if "user_id" not in session:
        return jsonify({"error": "Not authenticated"}), 401

    user_id = session["user_id"]
    result = chats.delete_many({"user_id": user_id})

    return jsonify({"success": True, "deleted_count": result.deleted_count})


if __name__ == "__main__":
    app.run(debug=True,host='0.0.0.0')
