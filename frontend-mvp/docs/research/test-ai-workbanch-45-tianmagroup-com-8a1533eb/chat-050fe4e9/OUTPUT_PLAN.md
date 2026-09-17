# Source clone output plan: chat, session detail, and task files

## Scope

- `/chat`: new-conversation landing, daily/expert history, search, two-level expert selection, quick prompts, attachment affordance.
- `/chat/:sessionId`: daily and expert conversation detail, rich answer content, answer anchors, task-file drawer, message actions, share bar.
- `/files`: grouped task-file list, expand/collapse, search, child file preview and download affordance.
- Global: logo returns to `/chat`; every icon-only control exposes an accessible label and hover tooltip.
- `/knowledge`: align permission management with the populated two-dialog source flow.

## Data policy

Frontend-only local prototype using realistic mock content observed in the authorized authenticated source. No source backend calls, credentials, or private APIs are copied.

## Acceptance

Each captured source state has a corresponding local route/state, keyboard-reachable controls, deterministic mock data, and a same-viewport visual comparison.
