# Islamic Insights: Conversational Islamic Knowledge Platform

[![Year Built](https://img.shields.io/badge/Year%20Built-2024-blue.svg)](#)


A full-stack Flask web application and AI assistant dedicated to contextual question answering on Islamic theology, ethics, history, and jurisprudence. Backed by MongoDB for persistent user account and conversation management, the platform utilizes Google Gemini 1.5 Flash with specialized domain instructions emphasizing Quranic and Hadith citations.

---

## Architectural Workflow

```
+-----------------------+      +---------------------------+      +--------------------------+
|  User Web Interface   | ---> | Flask Application Layer   | ---> | MongoDB Database Cluster |
|  (Auth, Chat History) |      | (Session, Auth, Mailer)   |      | (Users, Chats, Tokens)   |
+-----------------------+      +---------------------------+      +--------------------------+
                                             |
                                             v
                               +---------------------------+
                               | Google Gemini 1.5 Flash   |
                               | Structured System Prompts |
                               | RTL Arabic Text Support   |
                               +---------------------------+
```

---

## Core Features & Modules

1. Domain-Aligned AI Knowledge Engine:
   - Configured with custom system instructions that prioritize primary religious sources (Quran and Hadith).
   - Generates responses with right-to-left (`dir='rtl'`) HTML formatting for Arabic script verses and traditions.
   - Employs strict content safety thresholds against harassment, hate speech, and sectarian hostility.

2. Comprehensive Authentication & Security:
   - Registration with mandatory email verification tokens dispatched via SMTP.
   - Password reset workflow with time-limited crypto-secure tokens.
   - Secure credential hashing via Werkzeug security primitives (`generate_password_hash`).
   - Extended permanent session lifetimes with configurable duration policies.

3. Chat History & Session Management:
   - Full conversational persistence stored in MongoDB `chats` collection per user.
   - Dynamic endpoints for viewing historical conversation threads (`/chats`, `/chat`).
   - Granular privacy controls allowing users to delete specific conversations or clear entire chat archives.

---

## Technical Stack

- Backend Framework: Flask, Jinja2, Werkzeug
- Database: MongoDB (via PyMongo and BSON)
- AI Model: Google Generative AI (Gemini 1.5 Flash)
- Email Protocol: SMTP with TLS encryption (`smtplib`, `email.mime`)
- Frontend Interface: HTML5, CSS3, JavaScript, Responsive Mobile Drawer

---

## Environment Configuration

Configure the following variables in a `.env` file in the project root:

```env
# AI Model Configuration
GOOGLE_GENAI_API_KEY=your_gemini_api_key

# Flask Application Settings
FLASK_SECRET_KEY=your_secure_flask_secret_key
SESSION_LIFETIME_DAYS=14

# MongoDB Database Connection
MONGO_URI=mongodb://localhost:27017/islamic_chatbot

# SMTP Mail Server (for verification and password resets)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
```

---

## Installation & Running Locally

### Prerequisites
- Python 3.9 or newer
- MongoDB running locally or accessible via network URI
- Valid Google Gemini API key

### Execution Steps

1. Clone repository:
   ```bash
   git clone https://github.com/mianjunaid1223/Islamic-Insights.git
   cd Islamic-Insights
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Launch server:
   ```bash
   python main.py
   ```

4. Open `http://127.0.0.1:5000` in your browser to access the registration and chat interface.

---

## API Endpoints Reference

- `GET /`: Main chat dashboard (requires active user session).
- `GET /welcome`: Landing introduction page for guest visitors.
- `POST /signup`: User registration endpoint triggering verification email.
- `POST /verify-email`: Token validation for account activation.
- `POST /login`: User authentication and session cookie generation.
- `GET /logout`: Terminates session and redirects to login.
- `POST /forgot-password`: Initiates password recovery email.
- `POST /reset-password/<token>`: Updates user password after token verification.
- `POST /ask`: Primary chat endpoint delivering prompt to Gemini and saving response to MongoDB.
- `GET /chats`: Retrieves list of user's past chat sessions.
- `POST /delete_chat`: Purges a specific conversation thread.
- `POST /delete_all_chats`: Clears all chat history for the authenticated user.

---

## Project Structure

```
Islamic-Insights/
|-- main.py                    # Complete application controllers and Gemini client
|-- requirements.txt           # Python dependency requirements
|-- template/                  # HTML templates for authentication and chat screens
|-- static/                    # Static CSS, JS, and UI media assets
```
