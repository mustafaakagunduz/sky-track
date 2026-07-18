# Project Rules for Claude Code

This project is built strictly according to `PROJECT_PLAN.md`. Read it before doing anything.

## Phase discipline (most important rule)
- The plan has 3 phases. Work on **one phase at a time**.
- **Never start a new phase without explicit user approval** (the user will say something like "start Phase 2").
- When a phase is complete: stop, summarize what was built, explain how the user can verify the acceptance criteria (exact commands/URLs), and wait.
- If you finish early or something seems missing from the plan, ask — do not invent new scope.
- Track actual progress in root `PROGRESS.md`. The moment a task item is completed **and you have verified it actually works** (not just written the code — run it, curl it, check the logs), immediately check it off (`[ ]` → `[x]`) in `PROGRESS.md`. Never check something off speculatively or before verifying.

## General rules
- Respect the "Out of Scope" section of the plan. Do not add auth, Celery, SSR, or anything listed there.
- Keep it simple: this is a portfolio project. Prefer boring, readable solutions over clever ones.
- The system must always be runnable with `docker compose up` at the end of every phase.
- Tech stack is fixed in the plan — do not substitute libraries.
- Git workflow:
  - Commit at logical checkpoints — each commit should represent one coherent unit of work (e.g. docker compose setup, aircraft model + migrations, websocket consumer). Never lump a whole phase into a single giant commit.
  - **Commit messages in English**, conventional-commit style with a short imperative summary (e.g. `feat: add simulator ingest command`, `feat: render live aircraft on map`, `chore: set up docker compose`, `fix: reconnect websocket on drop`).
  - Push directly to `main` after each commit (or small group of commits). No feature branches, no PRs.
  - GitHub repo: https://github.com/mustafaakagunduz/sky-track.git
  - Never commit/push: `.env` (secrets/local config — only `.env.example` is tracked), `node_modules/`, Python `__pycache__`/`.venv`, build output (`dist/`), `.DS_Store`, `.claude/settings.local.json` (machine-specific), or any DB dumps/volumes. Rely on `.gitignore`; double-check `git status` before pushing.
- This machine only has a standalone `docker-compose` binary, not the `docker compose` plugin. Always use `docker-compose` (with the hyphen) in commands and docs for this project.
- UI strings in English, always through i18next (`en.json`).

## External docs / research
- OpenSky Network API documentation is reachable via the `context7` MCP server. Their docs site has several sections (REST API, Trino client, Python API, Java API, etc.) — for this project only the **REST API** section is relevant (that's what `run_ingest.py` calls directly over HTTP); the others are alternative client libraries we don't use.
- Ask before using context7 only when you're actually unsure how to do something (API params, auth, response shape, library usage) — if you already know, don't ask, just proceed. This also applies mid-debugging: if an implementation looks correct but isn't producing the expected result, that's a good signal to ask and check context7 in case the external API/library changed since training.
