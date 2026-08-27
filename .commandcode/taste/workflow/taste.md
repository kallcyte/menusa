# Workflow

- Expects implementation to be verified before declaring done: run typecheck, tests, and production build, plus a smoke test (e.g., hitting the dev server / SSR render) after code changes. Confidence: 0.8
- Values tracking multi-step implementation work with a todo list that is kept updated as steps complete, and explicitly asks the agent to recheck the todo list before continuing. Confidence: 0.75
- Comfortable steering long multi-phase work with terse "continue"/"retry" prompts, granting autonomy to carry a phase or approved batch to completion — including self-spotted fixes and cleanup of the agent's own mistakes — without per-step approval. Confidence: 0.8
- Expects a consolidated end-of-phase summary: bulleted what-changed, required manual steps (e.g., migrations to apply before deploy), deferred items with rationale, and candid disclosure of mistakes made and how they were resolved. Confidence: 0.6
