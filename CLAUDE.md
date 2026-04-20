# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

InspectAI Bot is a Telegram bot for building inspection evidence collection. Inspectors navigate a hierarchical location tree (Building → Block → Floor → Room), capture photos/notes that are buffered in RAM per session, then batch-upload to Google Drive (folder hierarchy) and Google Sheets (metadata log) with Gemini AI analysis of each photo.

## Commands

```bash
npm run dev      # Development mode: hot-reload + Long Polling (no webhook required)
npm run build    # Compile TypeScript → dist/
npm start        # Production: webhook mode (requires WEBHOOK_DOMAIN env var)
```

There is no configured test runner (`npm test` will fail). Integration tests in `/tests/` require `.env` and local image assets and are run manually with `npx ts-node tests/<file>.test.ts`.

There is no linter configured. TypeScript is compiled with `strict: false`.

## Required Environment Variables

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | BotFather token |
| `GOOGLE_CREDENTIALS_BASE64` | Base64-encoded Service Account JSON |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Root Drive folder ID for all evidence |
| `GEMINI_API_KEY` | Google Generative AI key (Gemini 2.5 Flash) |
| `NODE_ENV` | `development` or `production` |
| `WEBHOOK_DOMAIN` | Public URL (production only, e.g., `https://meu-bot.onrender.com`) |
| `APPS_SCRIPT_WEBHOOK_URL` | Apps Script bridge URL (optional but preferred — see below) |
| `PORT` | HTTP port (default: 3000) |

## Architecture

### Entry Points

- **`src/server.ts`** — Express app setup, bot command registration, dual-mode networking: webhook in production, long polling in development.
- **`src/bot.ts`** — All command handlers (`/setor`, `/sincronizar`, `/cancelar`, `/reinspecao`, `/ajuda`) and passive photo/text message listeners.

### Session Model

Each user has an isolated in-memory session (`telegraf` session middleware) containing:
- `currentLocation: string` — The active sector selected via wizard
- `mediaBuffer: MediaItem[]` — Queued photos and text notes not yet synced
- `reinspectionMode: boolean` — Tracks re-inspection workflow state

Data persists only for the bot process lifetime — there is no database.

### Sector Wizard (`src/scenes/sectorWizard.ts`)

A Telegraf `WizardScene` FSM that renders inline keyboard menus from the `BUILDINGS_CONFIG` tree in `src/config/locations.ts`. Callback buttons use **numeric indices** (not labels) to avoid Telegram's 64-byte `callback_data` limit. The wizard supports unlimited nesting depth and a "Back" button at every level.

### Sync Flow (`/sincronizar` command in `src/bot.ts`)

1. Group `mediaBuffer` items by sector location
2. For each sector group, call `resolveLocationPath()` to create/fetch the Drive folder hierarchy
3. For each item in batches of 3 (parallel):
   - Download photo buffer from Telegram CDN
   - Simultaneously: analyze with Gemini AI (`src/services/analysisAi.ts`) and upload to Drive (`src/services/google.ts`)
4. Batch-append all rows to the sector's Google Sheets tab
5. Clear `mediaBuffer` and report Drive/Sheets links

### Google Integration (`src/services/google.ts`)

Two authentication paths, tried in order:
1. **Apps Script webhook bridge** (`apps-script/Code.gs`) — Preferred. Routes Drive/Sheets writes through a Google Apps Script deployment, which runs as a full Google Account (avoids Service Account's 0 GB Drive storage quota).
2. **Service Account fallback** — Direct JWT auth via `googleapis`. Used when `APPS_SCRIPT_WEBHOOK_URL` is not set.

The Apps Script bridge exposes a single POST endpoint that dispatches on an `action` field (`createFolder`, `createSpreadsheet`, `writeJson`, or default photo upload with base64 decode).

### AI Analysis (`src/services/analysisAi.ts`)

Sends image buffer + inspector caption to `gemini-2.5-flash`. Returns structured JSON:
```json
{ "falha": "...", "diretriz": "...", "criticidade": "ALTA|MEDIA|BAIXA", "justificativa_risco": "..." }
```

### Keep-Alive (`src/utils/keepAlive.ts`)

Self-pings `GET /ping` every 14 minutes to prevent Render free-tier hibernation.

## Key Conventions

- **Portuguese throughout:** All bot messages, location names, command names, and sheet column headers are in Portuguese. Keep this consistent.
- **Batch-first design:** Never upload individual items eagerly. All media accumulates in `mediaBuffer` until the user explicitly runs `/sincronizar`.
- **Sector grouping in sync:** API calls are minimized by processing all items for a given sector together before moving to the next sector.
- **Index-based callbacks:** When adding new wizard steps, always use numeric indices for `callback_data`, never raw text labels.
- **Parallel uploads capped at 3:** The concurrency limit in sync is intentional to avoid Drive API rate limits.
