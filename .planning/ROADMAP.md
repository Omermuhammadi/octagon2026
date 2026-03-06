# Roadmap: Octagon Oracle

## Milestones

- ✅ **v1.0 Core Platform** - Phases 1-8 (shipped 2026-02-08)
- 🚧 **v1.1 Production Hardening** - Phases 9-13 (in progress)

## Phases

<details>
<summary>✅ v1.0 Core Platform (Phases 1-8) — SHIPPED 2026-02-08</summary>

### Phase 1: Account Management
**Goal**: Secure user system with 4 roles and persistent profiles
**Requirements**: REQ-01
**Status**: Complete

### Phase 2: Win & Technique Prediction
**Goal**: Real ML predictions with probability, method, round, and confidence
**Requirements**: REQ-02
**Status**: Complete

### Phase 3: Fighter Comparison & Strategy
**Goal**: Side-by-side fighter comparison with strategic counter-suggestions
**Requirements**: REQ-03
**Status**: Complete

### Phase 4: Training Roadmaps
**Goal**: Age-based, discipline-specific training paths with backend progress tracking
**Requirements**: REQ-04
**Status**: Complete

### Phase 5: Gym Finder & Self-Defense
**Goal**: Geolocation-based gym search and women's safety self-defense guide
**Requirements**: REQ-05, REQ-06
**Status**: Complete

### Phase 6: Form Correction
**Goal**: Real-time pose detection for strike analysis with MediaPipe
**Requirements**: REQ-07
**Status**: Complete

### Phase 7: Gear Store
**Goal**: Product catalog with cart and checkout flow
**Requirements**: REQ-08
**Status**: Complete

### Phase 8: Chatbot & Dashboard Stats
**Goal**: LLM-powered chatbot with retrieval + real persistent dashboard stats
**Requirements**: REQ-09, REQ-10
**Status**: Complete

</details>

### 🚧 v1.1 Production Hardening (In Progress)

**Milestone Goal:** Make the existing platform stable, tested, and production-ready.

#### Phase 9: Version Control & Build Verification
**Goal**: Initialize git, verify entire application builds and runs cleanly
**Depends on**: v1.0 complete
**Requirements**: REQ-11, REQ-12
**Success Criteria** (what must be TRUE):
  1. Git repository initialized with proper .gitignore and initial commit
  2. Backend compiles with 0 TypeScript errors
  3. Frontend builds all pages with 0 errors
  4. Docker compose brings up all 3 services (MongoDB, backend, frontend) successfully
  5. All API health checks pass
**Plans**: TBD

Plans:
- [ ] 09-01: Git init, .gitignore, and initial commit
- [ ] 09-02: Full build verification (backend + frontend + Docker)

#### Phase 10: Bug Fixes & Runtime Validation
**Goal**: Run every feature end-to-end, identify and fix broken paths
**Depends on**: Phase 9
**Requirements**: REQ-13
**Success Criteria** (what must be TRUE):
  1. All 35+ API endpoints return expected responses
  2. All 17 frontend pages render without runtime errors
  3. Auth flow works end-to-end (register, login, profile, logout)
  4. Prediction, comparison, training, gym, form-check, gear, and chat features work
  5. Dashboard stats calculate correctly from real user activity
**Plans**: TBD

Plans:
- [ ] 10-01: Backend API comprehensive testing and fixes
- [ ] 10-02: Frontend page-by-page validation and fixes

#### Phase 11: UI/UX Polish
**Goal**: Production-grade visual quality, responsive design, proper loading/error states
**Depends on**: Phase 10
**Requirements**: REQ-14
**Success Criteria** (what must be TRUE):
  1. All pages are responsive (mobile, tablet, desktop)
  2. Loading states exist for all async operations
  3. Error boundaries catch and display user-friendly error messages
  4. Consistent styling and typography across all pages
**Plans**: TBD

Plans:
- [ ] 11-01: Responsive design audit and fixes
- [ ] 11-02: Loading states, error boundaries, and UX polish

#### Phase 12: Google Maps Integration
**Goal**: Visual map markers on gym finder page
**Depends on**: Phase 10
**Requirements**: REQ-15
**Success Criteria** (what must be TRUE):
  1. Gym finder page shows an interactive Google Map
  2. Each gym appears as a marker on the map
  3. Clicking a marker shows gym details
  4. Map centers on user location when geolocation is used
**Plans**: TBD

Plans:
- [ ] 12-01: Google Maps integration on gym finder page

#### Phase 13: Automated Testing
**Goal**: Test coverage for critical paths
**Depends on**: Phase 10
**Requirements**: REQ-16
**Success Criteria** (what must be TRUE):
  1. Backend API tests cover auth, predictions, and core CRUD operations
  2. Frontend component tests cover key user flows
  3. Tests can be run via a single command (`npm test`)
**Plans**: TBD

Plans:
- [ ] 13-01: Backend API test suite
- [ ] 13-02: Frontend component tests

## Progress

**Execution Order:** 9 → 10 → 11 / 12 / 13 (11, 12, 13 can run in parallel)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Account Management | v1.0 | 1/1 | Complete | 2026-02-08 |
| 2. Win Prediction | v1.0 | 1/1 | Complete | 2026-02-08 |
| 3. Fighter Comparison | v1.0 | 1/1 | Complete | 2026-02-08 |
| 4. Training Roadmaps | v1.0 | 1/1 | Complete | 2026-02-08 |
| 5. Gym & Self-Defense | v1.0 | 1/1 | Complete | 2026-02-08 |
| 6. Form Correction | v1.0 | 1/1 | Complete | 2026-02-08 |
| 7. Gear Store | v1.0 | 1/1 | Complete | 2026-02-08 |
| 8. Chatbot & Stats | v1.0 | 1/1 | Complete | 2026-02-08 |
| 9. Git & Build | v1.1 | 0/2 | Not started | - |
| 10. Bug Fixes | v1.1 | 0/2 | Not started | - |
| 11. UI/UX Polish | v1.1 | 0/2 | Not started | - |
| 12. Maps Integration | v1.1 | 0/1 | Not started | - |
| 13. Testing | v1.1 | 0/2 | Not started | - |
