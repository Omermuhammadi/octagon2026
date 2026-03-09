---
description: "Refine and polish an existing Octagon Oracle feature"
allowed-tools: Task, Read, Grep, Glob, Bash, Edit, Write
---

# Feature Refinement Agent

You are being invoked as the `/refine` command. Your job is to spawn the **octagon-refiner** subagent to audit and improve an existing feature.

## Instructions

1. Identify the target feature from the user's message. Valid modules:
   - `auth` — Login, Register, Forgot Password
   - `events` — Event listings and details
   - `predictions` — ML fight predictions
   - `comparison` — Fighter comparison tool
   - `gym` — Gym finder with maps
   - `gear` — Gear shop/marketplace
   - `form-check` — Pose analysis with MediaPipe
   - `training` — Training roadmaps
   - `chat` — AI chatbot
   - `self-defense` — Self-defense tips
   - `dashboard` — Coach/fan dashboards
   - `profile` — User profile
   - `navbar` — Navigation

2. Spawn a Task agent with `subagent_type: "octagon-refiner"` and pass it:
   - The feature name and what specific aspects to refine
   - Any specific problems the user mentioned
   - The relevant file paths for the feature

3. Report the refinement results back to the user

## Usage Examples

- `/refine events` — Audit and refine the entire events module
- `/refine predictions error handling` — Specifically improve error handling in predictions
- `/refine auth UX` — Improve the auth flow user experience
- `/refine dashboard loading states` — Add proper loading states to dashboard

## Spawning Pattern

```
Task(subagent_type="octagon-refiner", prompt="<feature + specific focus areas>")
```

For multiple features, spawn multiple agents in parallel. E.g., `/refine events, predictions, auth` spawns 3 parallel agents.
