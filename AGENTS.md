<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Pre-commit (Fallow)

`git commit` runs `fallow audit` via `.git/hooks/pre-commit` (gate **new-only** vs `main`). Before committing agent changes, run `npm run fallow:audit` and fix **fail** verdict findings. Do not use `--no-verify` unless the user asks.
