# Octagon Oracle

## What This Is

Octagon Oracle is an AI-powered MMA analytics platform that serves fighters, coaches, beginners, and fans. It provides ML-based fight predictions, fighter comparisons with strategy suggestions, age-based training roadmaps, real-time pose-detection form correction, a gym finder with geolocation, a self-defense guide, a gear store, and an LLM-powered chatbot — all backed by real UFC data (4,447 fighters, 8,424 fights).

## Core Value

Deliver real, data-backed MMA insights and personalized training tools that help users improve, learn, and engage with the sport — not just consume static content.

## Requirements

### Validated

- [x] REQ-01: Secure user accounts with 4 roles (fighter, beginner, coach, fan) and persistent profiles — v1.0
- [x] REQ-02: ML fight predictions (winner, probability, method, round, confidence, top 3 factors) — v1.0
- [x] REQ-03: Fighter comparison with radar charts and 6-dimension strategy suggestions — v1.0
- [x] REQ-04: Age-based training roadmaps (3 age groups x 3 disciplines) with backend progress tracking — v1.0
- [x] REQ-05: Gym finder with geolocation (Haversine nearby search) and database-backed listings — v1.0
- [x] REQ-06: Self-defense guide with women's safety section and Pakistan emergency resources — v1.0
- [x] REQ-07: Form correction via MediaPipe pose detection (33 landmarks, 4 techniques, client-side) — v1.0
- [x] REQ-08: Gear store with product catalog, cart, and checkout flow — v1.0
- [x] REQ-09: LLM chatbot (Groq/Llama 3.3 70B) with retrieval from fighters/gyms/products + guardrails — v1.0
- [x] REQ-10: Role-based dashboards with real persistent stats calculated from user activity — v1.0

### Active

- [ ] REQ-11: Initialize git repository and establish version control workflow
- [ ] REQ-12: Verify full application builds and runs (backend + frontend + Docker)
- [ ] REQ-13: Fix any broken features, runtime errors, or UI issues discovered during testing
- [ ] REQ-14: Polish UI/UX for production-grade feel (responsive design, loading states, error boundaries)
- [ ] REQ-15: Add Google Maps visual markers to gym finder
- [ ] REQ-16: Automated testing (unit tests for critical paths, API integration tests)
- [ ] REQ-17: Production deployment pipeline (CI/CD, environment configs)

### Out of Scope

- Social features (comments, follows, DMs) — not in current scope per PRD
- Live streaming — not in current scope per PRD
- Native mobile app — web only for now
- Real payment processing — affiliate/skeleton checkout for MVP
- Custom model training for form correction — using pre-trained MediaPipe + template calibration

## Context

- **Codebase**: Full-stack TypeScript (Next.js 16 + Express.js + MongoDB) under `Octagon/` directory
- **Data**: UFC CSV data imported — 4,447 fighters, 16,908 fight records, 100+ events
- **ML Model**: Logistic regression trained on fight stats, 70.7% accuracy, weights in `model-weights.json`
- **Pose Detection**: MediaPipe Pose Landmarker running client-side, 4 technique templates
- **Chatbot**: Groq API (Llama 3.3 70B) with automatic fallback to keyword system
- **Docker**: docker-compose.yml orchestrates MongoDB + backend + frontend
- **All 8 modules implemented**: Code complete as of Feb 8, 2026 per summary.md
- **No git repo**: Version control not yet initialized
- **No automated tests**: No unit/integration/e2e test suites exist

## Constraints

- **Tech Stack**: Next.js 16, React 19, Express.js, MongoDB, TypeScript — established, do not change
- **ML Privacy**: Form correction video never leaves the browser (MediaPipe client-side)
- **Dependencies**: Groq API key required for LLM chatbot (graceful fallback exists)
- **Data**: Pakistan-focused gym data and emergency resources
- **Platform**: Web only (no mobile app)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MediaPipe client-side for form correction | Privacy — video never uploaded | Good |
| Logistic regression for fight predictions | Simple, interpretable, 70.7% accuracy with available data | Good |
| Groq/Llama 3.3 70B for chatbot | Fast inference, open-source model, free tier | Good |
| MongoDB for all data | Single database simplifies architecture | Good |
| No real Stripe payments in v1.0 | Compliance complexity, affiliate model sufficient for MVP | Pending |
| 4 user roles (fighter/beginner/coach/fan) | Covers all personas from PRD | Good |

---
*Last updated: 2026-03-06 after GSD initialization*
