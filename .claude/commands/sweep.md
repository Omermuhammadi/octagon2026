---
description: "Spawn all 3 Octagon agents in parallel: debug, refine, and design"
allowed-tools: Task, Read, Grep, Glob, Bash, Edit, Write
---

# Full Sweep — Parallel Multi-Agent Spawn

You are being invoked as the `/sweep` command. Your job is to spawn ALL THREE Octagon agents **in parallel** to simultaneously debug, refine, and design improvements for a target feature or module.

## Instructions

1. Identify the target(s) from the user's message
2. Spawn **three Task agents in a SINGLE message** (parallel execution):

   **Agent 1 — octagon-debugger**: Find and fix any bugs or performance issues in the target
   **Agent 2 — octagon-refiner**: Audit and refine error handling, edge cases, validation, UX
   **Agent 3 — octagon-designer**: Improve layout, visuals, responsiveness, animations

3. Wait for all three to complete
4. Compile a unified report with all changes from all agents

## Usage Examples

- `/sweep events` — Full debug + refine + design sweep of the events module
- `/sweep predictions` — All three agents work on the predictions feature
- `/sweep dashboard, events` — Sweep multiple modules (spawn 6 agents total)

## Spawning Pattern (MUST be in a single message for parallelism)

```
// All three in ONE message — they run in parallel
Task(subagent_type="octagon-debugger", prompt="Investigate bugs and performance issues in [TARGET]. Project root: c:\Users\iLaptop.pk\OneDrive\Desktop\Projects\OCTAGONOMER. ...")
Task(subagent_type="octagon-refiner", prompt="Audit and refine [TARGET] feature. Project root: c:\Users\iLaptop.pk\OneDrive\Desktop\Projects\OCTAGONOMER. ...")
Task(subagent_type="octagon-designer", prompt="Design and implement UI/UX improvements for [TARGET]. Project root: c:\Users\iLaptop.pk\OneDrive\Desktop\Projects\OCTAGONOMER. ...")
```

## Unified Report Format

After all agents complete, compile results:

```
## Sweep Report: [Target]

### Bugs Fixed (octagon-debugger)
[summary from debugger agent]

### Features Refined (octagon-refiner)
[summary from refiner agent]

### Design Improvements (octagon-designer)
[summary from designer agent]

### All Files Modified
[combined file list from all agents]
```

CRITICAL: Always spawn all three agents in a SINGLE tool-call message to ensure true parallel execution. Do NOT spawn them sequentially.
