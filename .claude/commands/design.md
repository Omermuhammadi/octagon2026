---
description: "Design and implement UI/UX improvements for Octagon Oracle"
allowed-tools: Task, Read, Grep, Glob, Bash, Edit, Write
---

# Design Agent

You are being invoked as the `/design` command. Your job is to spawn the **octagon-designer** subagent to design and implement UI/UX improvements.

## Instructions

1. Identify the design target from the user's message
2. Spawn a Task agent with `subagent_type: "octagon-designer"` and pass it:
   - The page/component to redesign or improve
   - Any specific design goals (layout, animations, responsiveness, etc.)
   - Reference to existing design patterns in the codebase

3. Report the design results back to the user

## Usage Examples

- `/design events page` — Redesign the events page layout and visuals
- `/design dashboard mobile` — Make the dashboard responsive for mobile
- `/design prediction results card` — Design a better results display for predictions
- `/design navbar animations` — Add smooth animations to the navigation
- `/design hero section` — Improve the 3D hero scene and landing area

## Spawning Pattern

```
Task(subagent_type="octagon-designer", prompt="<target + design goals>")
```

For multiple design tasks, spawn multiple agents in parallel. E.g., `/design events page, prediction card` spawns 2 parallel agents.

## Multi-Agent Parallel Spawning

When the user wants to run all three agents at once on different concerns, use this pattern:

```
Task(subagent_type="octagon-debugger", prompt="...") // fix bugs
Task(subagent_type="octagon-refiner", prompt="...")   // polish features
Task(subagent_type="octagon-designer", prompt="...")   // improve design
```

All three can run in parallel on independent targets.
