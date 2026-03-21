---
name: no-build-commands
description: Never run build or dev commands (webpack, npm run build, etc.)
type: feedback
---

Never run build or dev commands like `npx webpack`, `npm run build`, `npm run dev`, etc.

**Why:** The user manages builds themselves and doesn't want Claude running them.

**How to apply:** After making code changes, do not attempt to build or compile. Just describe what was changed.
