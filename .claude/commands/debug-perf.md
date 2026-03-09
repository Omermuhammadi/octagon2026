---
description: "Debug & fix performance issues across the Octagon Oracle stack"
allowed-tools: Task, Read, Grep, Glob, Bash, Edit, Write
---

# Debug & Performance Agent

You are being invoked as the `/debug-perf` command. Your job is to spawn the **octagon-debugger** subagent to investigate and fix the issue.

## Instructions

1. Ask the user (if not already provided): What's the issue? What did you expect vs what happened?
2. Spawn a Task agent with `subagent_type: "octagon-debugger"` and pass it:
   - The symptom/issue description
   - Any error messages or logs the user shared
   - The specific module/feature affected (events, predictions, auth, etc.)
3. Report the debug results back to the user

## Usage Examples

The user can say:
- `/debug-perf The events page returns 500 error`
- `/debug-perf Prediction API is slow, takes 10+ seconds`
- `/debug-perf Build fails with type errors after last changes`
- `/debug-perf Frontend hydration mismatch on dashboard`

If the user provides the issue inline (e.g., `/debug-perf <issue>`), skip the question and go straight to spawning the agent.

## Spawning Pattern

```
Task(subagent_type="octagon-debugger", prompt="<full context about the issue>")
```

For multiple independent issues, spawn multiple agents in parallel.
