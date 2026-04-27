# Octagon Oracle — Project Context

## Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion 12
- **Backend**: Express.js TypeScript, MongoDB 7 (Mongoose 8), JWT auth, Groq API (Llama 3.3 70B)
- **ML**: Custom TypeScript ensemble model, 70.7% accuracy on 8,424+ UFC fights
- **Ports**: Frontend 3000, Backend 5001, MongoDB 27017

## Key File Paths
| Module | Path |
|--------|------|
| Frontend app | `frontend/app/` |
| Backend src | `backend/src/` |
| Chatbot UI | `frontend/components/Chatbot.tsx` |
| Chatbot API | `backend/src/controllers/chatController.ts` |
| Prediction | `frontend/app/prediction/page.tsx` |
| Comparison | `frontend/app/comparison/page.tsx` |
| Training | `frontend/app/training/page.tsx` |
| Strategy | `frontend/app/strategy/page.tsx` |
| Gyms | `frontend/app/gyms/page.tsx` |
| Self-Defense | `frontend/app/self-defense/page.tsx` |
| Dashboard Fan | `frontend/app/dashboard/fan/page.tsx` |
| Dashboard Coach | `frontend/app/dashboard/coach/page.tsx` |
| Auth Context | `frontend/contexts/AuthContext.tsx` |
| API lib | `frontend/lib/api.ts` |
| Radar Chart | `frontend/components/charts/FighterRadarChart.tsx` |
| Navbar | `frontend/components/Navbar.tsx` |
| UI Components | `frontend/components/ui/` |

## Environment Setup
```bash
# Backend .env (D:\octagonNEW\Octagon\backend\.env)
PORT=5001
MONGODB_URI=mongodb://localhost:27017/octagon-oracle
JWT_SECRET=octagonoracle-secret-2025-super-long-secure
FRONTEND_URL=http://localhost:3000
GROQ_API_KEY=<your-groq-key>
GROQ_MODEL=llama-3.3-70b-versatile

# Start servers
cd backend && npm run dev    # Terminal 1
cd frontend && npm run dev   # Terminal 2
```

## MongoDB Collections
- `fighters` — UFC fighter profiles with stats
- `events` — UFC event data
- `users` — registered users (hashed passwords, JWT tokens)
- `roadmaps` — training roadmap templates
- `assignments` — coach→fighter task assignments

## UFC Color Theme
- Background: `bg-white` / `bg-gray-50`
- Text: `text-gray-900` (primary), `text-gray-500` (secondary)
- Primary Red: `bg-red-600` / `text-red-600` (UFC red)
- Accent Gold: `bg-amber-500` / `text-amber-600` (championship)
- Borders: `border-gray-200`
- Cards: `bg-white border border-gray-200 shadow-sm rounded-2xl`
- **Hero/Home**: Dark theme intentional (UFC poster style) — keep `bg-black`
- **Auth Left Panel**: Dark with image — keep as-is
- **Auth Right Panel**: `bg-white` (white form area)

## Tailwind v4 Note
Uses `@theme` CSS block in `frontend/app/globals.css` — NOT `tailwind.config.ts`.
Custom vars: `--color-octagon-red: #DC2626`, `--color-octagon-gold: #F59E0B`

## Common Pitfalls
- TypeScript narrowing: extract `res.data` to local const before using in callback
- Tailwind v4: no `tailwind.config.ts` — custom colors in `globals.css @theme`
- CORS: backend allows `FRONTEND_URL` from `.env`
- JWT: Bearer token in `Authorization` header
- MongoDB must be running before starting backend (`mongod` or Windows service)

## API Routes
- `POST /api/auth/register` — register user
- `POST /api/auth/login` — login, returns JWT
- `GET /api/fighters` — list fighters (paginated)
- `GET /api/fighters/:id` — fighter profile
- `POST /api/prediction/predict` — ML prediction
- `POST /api/chat/message` — chatbot (Groq LLM)
- `GET /api/roadmaps` — training roadmaps
- `GET /api/gyms` — gym listings
- `GET /api/health` — health check
