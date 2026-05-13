# 🥊 Octagon Oracle

> AI-Powered MMA Analytics & Coaching Platform — Fight predictions, fighter comparisons, structured training roadmaps with concept-checks & practice logging, coach⇄athlete connections, gym finder, and form correction.

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

---

## 🚀 Quick Start (Local — No Docker)

This is the **recommended** path. The project runs entirely on your machine using local MongoDB Compass / mongod.

### Prerequisites
- **Node.js 20+** ([Download](https://nodejs.org/))
- **MongoDB 7+** (Community Edition + Compass for GUI) ([Download](https://www.mongodb.com/try/download/community))
- Two free terminals (one for backend, one for frontend)

### Step 1 — Clone & enter the project
```bash
git clone https://github.com/Omermuhammadi/Octagon.git
cd Octagon
```

### Step 2 — Start MongoDB locally
Make sure MongoDB is running on the default port `27017`. Verify in MongoDB Compass that you can connect to `mongodb://localhost:27017`.

- **Windows:** check the `MongoDB` service in `services.msc` is running, OR run `mongod` from a terminal.
- **Mac:** `brew services start mongodb-community`
- **Linux:** `sudo systemctl start mongod`

### Step 3 — Backend (Terminal 1)
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder:
```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/octagon-oracle
JWT_SECRET=octagonoracle-secret-2025-super-long-secure
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000

# Optional — enables the AI chatbot. Without it, the chatbot falls back to a keyword system.
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
```

Import the UFC dataset (only needed once) and start the dev server:
```bash
npm run import-data
npm run dev
```
✅ Backend running at **http://localhost:5001** — verify with [http://localhost:5001/api/health](http://localhost:5001/api/health).

### Step 4 — Frontend (Terminal 2)
```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend` folder:
```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

Start the dev server:
```bash
npm run dev
```
✅ Frontend running at **http://localhost:3000**.

### Step 5 — Use it
1. Open [http://localhost:3000](http://localhost:3000)
2. Register accounts with different roles to demo the platform: **Fan**, **Beginner**, **Fighter**, and **Coach**.
3. From a Coach account, head to **Connections** to browse athletes and send a request — no email required.
4. From a Fighter / Beginner / Fan account, head to **Find Coach / My Coach** to browse coaches and request to connect.
5. Open **Training** to walk through a roadmap: **Watch → Concept Check → Log Practice → Mark Complete**. As trainees progress, their stats appear live on the connected coach's dashboard.

---

## ✨ What's Inside

### Stakeholder-aware design

| Stakeholder | Highlights |
|-------------|------------|
| **Fan** | Fight predictions, fighter comparison, training roadmaps, self-defense, gym finder, events |
| **Beginner** | Beginner-tier roadmaps, concept-check quizzes, practice logging, find-a-coach, messaging |
| **Fighter** | Advanced roadmaps, fight camp, weight cut, opponent dossier, form check, find-a-coach |
| **Coach** | Discover athletes (no email needed), trainee analytics, live roadmap progress, AI strategy optimizer, assignments, messaging |

### Core features
- 🔮 **AI Fight Predictions** — ML ensemble model trained on 8,400+ UFC fights (~70.7% accuracy)
- ⚔️ **Strategy Optimizer** — coach-only AI fight game-plan generator
- 📊 **Fighter Comparison** — head-to-head radar charts and stats
- 🗺️ **Training Roadmaps** — 5 disciplines × 3 levels × 4 weeks of structured progression with:
   - YouTube-embedded technique videos
   - **Concept-check quizzes** per week (3-question MCQ with rationales)
   - **Practice logging** (minutes drilled + notes per session)
   - Server-side persisted progress, week-locking, and visible coach reporting
- 🤝 **Connections Hub** — browse-and-request workflow for both coaches and trainees, no emails
- 🎯 **Form Check** — live posture/technique correction
- 📅 **Events**, 🏢 **Gym Finder**, 🛡️ **Self-Defense Guide**

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion, GSAP |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | MongoDB 7 with Mongoose ODM |
| **Auth** | JWT (JSON Web Tokens) with bcrypt |
| **AI** | Groq (Llama 3.3 70B) for chatbot/strategy, custom TS ensemble for predictions |

---

## 📁 Project Structure

```
Octagon/
├── backend/                      # Express + Mongoose API
│   ├── src/
│   │   ├── controllers/          # Business logic per route
│   │   ├── models/               # Mongoose schemas (User, CoachRelationship, RoadmapProgress, …)
│   │   ├── routes/               # Express routers
│   │   ├── middleware/           # JWT protect, error handlers
│   │   └── server.ts             # App entry
│   └── .env                      # Local environment variables
├── frontend/                     # Next.js 16 app router
│   └── app/
│       ├── (auth)/               # Login / register
│       ├── dashboard/            # /coach, /fighter, /beginner, /fan dashboards
│       ├── connections/          # Connections Hub (Discover + Active + Past)
│       ├── training/             # Roadmaps + StepDetailModal + quizBank
│       ├── prediction/           # ML fight predictor
│       ├── strategy/             # AI strategy optimizer (coach only)
│       ├── form-check/           # Posture / form correction
│       └── …
└── README.md
```

---

## 🗄️ MongoDB Collections

- `users` — accounts (coach / fighter / beginner / fan), JWT-secured
- `fighters` — UFC fighter profiles & stats
- `events` — UFC event archive
- `coachrelationships` — coach⇄trainee links (pending / active / declined / ended)
- `roadmapprogresses` — per-user roadmap state, **quizResults**, **practiceLog**, totalMinutesTrained
- `assignments`, `fighterAssignments` — coach-assigned tasks & training programs
- `predictions`, `strategies`, `formsessions`, `chatlogs`, `fightcamps`, `weightlogs`, `messages`

---

## 🌐 API Routes (selected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login → returns JWT |
| GET | `/api/relationships/discover` | Coach: browse athletes (with pending-state) |
| GET | `/api/relationships/discover-coaches` | Trainee: browse coaches |
| POST | `/api/relationships` | Request a connection (`traineeId` or `coachId`) |
| PATCH | `/api/relationships/:id/respond` | Accept/decline a request |
| GET | `/api/roadmaps/progress` | Get all roadmap progress for current user |
| POST | `/api/roadmaps/progress` | Save week + completed-tasks state |
| POST | `/api/roadmaps/progress/quiz` | Submit a concept-check quiz |
| POST | `/api/roadmaps/progress/practice` | Log a practice session |
| GET | `/api/roadmaps/progress/trainees` | Coach: every trainee's roadmap stats |
| POST | `/api/prediction/predict` | ML fight outcome prediction |
| POST | `/api/strategy/generate` | AI fight strategy (coach only) |

---

## 🐛 Troubleshooting

### Backend won't connect to MongoDB
- Confirm MongoDB Compass connects to `mongodb://localhost:27017`.
- On Windows, open `services.msc` and start the `MongoDB Server` service.
- Re-check the `MONGODB_URI` value in `backend/.env`.

### Port already in use
```bash
# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5001).OwningProcess | Stop-Process -Force

# Mac/Linux
lsof -i :5001 ; kill -9 <PID>
```

### Frontend can't reach backend
- Confirm `NEXT_PUBLIC_API_URL=http://localhost:5001/api` in `frontend/.env.local`.
- Verify the backend health endpoint responds: `curl http://localhost:5001/api/health`.
- Check `FRONTEND_URL=http://localhost:3000` is set in `backend/.env` (CORS).

### Re-import the UFC dataset
```bash
cd backend
npm run import-data
```

---

## 🐳 Optional: Docker

A `docker-compose.yml` and `Dockerfile`s ship with the project for parity with cloud deployment, but **the local setup above is the recommended development path** and is what the current build is verified against. If you want Docker:

```bash
docker-compose up --build -d
docker exec octagon-oracle-backend npm run import-data
```

---

## 👥 Contributors

- **Omer Muhammadi** — Full Stack Development
- **Hamza Naeem** — Full Stack Development

---

## 📄 License

ISC — see `LICENSE`.
