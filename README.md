# Kudos Board

Kudos Board is a simple recognition app where team members can send and view appreciation messages.

## ✨ What this app does

- Show a list of recognition cards
- Let users send praise messages
- Store entries in MongoDB
- Serve the frontend as a static app and backend as an API

## 🚀 Live locally

1. Open terminal in the project folder
2. Start the local stack:

```bash
cd "/home/yatin/Desktop/My Notes/DevOps-Projetcs/kudos-board"
docker-compose up -d
```

3. Open in browser:
- App: `http://localhost:8080`
- API health: `http://localhost:5050/health`
- Data endpoint: `http://localhost:5050/api/kudos`

## 🧠 User flow

- Open the app in the browser
- Read existing kudos cards
- Send a new recognition message
- New cards appear in the list automatically

## 📁 Main files

- `docker-compose.yml` — local environment with frontend, backend, and MongoDB
- `frontend/src/App.jsx` — user interface and app logic
- `backend/server.js` — API routes and MongoDB connection

## 🔧 Local setup

The backend uses environment variables from `backend/.env.example`.

Example local environment values:

```env
MONGO_URI=mongodb://database:27017/kudosboard
PORT=5000
ALLOWED_ORIGINS=*
NODE_ENV=production
```

> Keep your real `.env` file private and do not commit it to GitHub.

## 📌 Notes for users

This repository contains the full app source code. If you just want to use the app, run the local Docker steps above.

## ☁️ For deployment (optional)

If you want to deploy this app to AWS, the project already includes files for that:
- `buildspec.yml` — build instructions for AWS CodeBuild
- `task-definition.json` — ECS task definition template

If you want, I can also update this README with a simple AWS deployment guide next.

---

Built by **Yatin Gambhir**. 🚀

