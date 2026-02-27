![Banner](banner.svg)

# one-prompt-saas

> One prompt. One command. Full deployed SaaS.

This repo contains 5 carefully engineered prompts. Each one, when given to Claude Code, produces a **complete, deployable application** — authentication, database, API, frontend, deployment config. Everything.

## Quick Start

```bash
npx one-prompt-saas
```

Pick a template. A directory is created with a `CLAUDE.md`. Open Claude Code in it. Watch it build everything.

## Templates

| Template | What It Builds | Stack |
|----------|---------------|-------|
| Todo SaaS | Full todo app with auth, categories, due dates | Express + SQLite + JWT |
| URL Shortener | Link shortener with click analytics dashboard | Express + SQLite (LRU cache) |
| Pastebin | Code sharing with syntax highlighting + expiry | Express + SQLite + Highlight.js |
| Status Page | Service monitoring with incident history + alerts | Express + SQLite + Nodemailer |
| Invoice Generator | PDF invoices with Stripe-ready checkout | Express + SQLite + PDFKit + Stripe |

## How It Works

Each template is a single, meticulously crafted prompt (~120-150 lines) that tells Claude Code exactly what to build. No ambiguity, no gaps. The prompt IS the specification.

Claude Code reads the `CLAUDE.md` in your new project directory and implements the entire application — database schema, API routes, frontend, deployment config — without further input.

The magic is not AI. It is prompt engineering. A well-written spec gets a well-built app.

## Each Prompt Specifies

- Complete database schema (SQL)
- Every API route with request/response shape
- Validation rules and error formats
- Frontend pages, interactions, and design tokens
- Deployment config (`render.yaml` + `Dockerfile`)
- A final checklist Claude verifies before finishing

## Usage

### Interactive

```bash
npx one-prompt-saas
```

Prompts you to pick a template and name your project.

### Flags

```bash
# Skip prompts
npx one-prompt-saas --template todo-saas --name my-todos

# Run Claude Code automatically after scaffolding
npx one-prompt-saas --auto

# Both
npx one-prompt-saas --template invoice-generator --name invoicr --auto
```

### Auto Mode

```bash
npx one-prompt-saas --auto
```

Launches `claude --dangerously-skip-permissions` in your new project directory. Come back to a built app.

Requires Claude Code installed: `npm i -g @anthropic-ai/claude-code`

## After Claude Builds It

Every generated app includes a `render.yaml` for one-click Render deployment and a `Dockerfile` for containerized hosting.

```bash
cd my-project
npm install
npm start
# open localhost:3000
```

## Requirements

- Node.js 18+
- Claude Code (`npm i -g @anthropic-ai/claude-code`) — only for `--auto` mode

## Related

- [zero-to-prod](https://github.com/NickCirv/zero-to-prod) — Speedrun: empty dir to deployed app
- [sleep-and-ship](https://github.com/NickCirv/sleep-and-ship) — Queue tasks overnight, ship while you sleep

## License

MIT — NickCirv
