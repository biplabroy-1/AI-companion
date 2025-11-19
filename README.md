<div align="center">

# AI Companion (Lovable + Supabase)

An adaptive AI "best friend" chat application with mood-aware responses, personalization, and streaming AI completions. Built with React, Vite, Tailwind, shadcn-ui, Supabase, and Lovable's AI Gateway.

</div>

---

## Table of Contents

1. Overview
2. Feature Highlights
3. Architecture & Flow
4. Tech Stack
5. Directory Map
6. Environment Variables & Secrets
7. Supabase Schema & Migrations
8. Edge Functions (API Specs)
9. Chat Function Detailed Walkthrough
10. Mood Detection Logic
11. Personalization Model
12. UI Components Inventory
13. Local Development
14. Deployment (Vercel / Lovable)
15. Security & Data Protection
16. LLM Context Guide (For Model Ingestion)
17. Troubleshooting
18. Roadmap / Extensibility

---

## 1. Overview

This project implements an AI-powered companion that adapts its tone ("mood") based on recent user messages, persists personalization settings per user, and streams responses from an external AI provider (Lovable AI Gateway). Supabase is used for authentication (future-ready), configuration storage, and edge functions. The frontend is a modern, componentized dashboard with chat, stats, and personalization dialogs.

## 2. Feature Highlights

- Mood-aware AI chat with dynamic tone instructions.
- Streaming responses via Server-Sent Events (SSE).
- Per-user companion configuration (name, personality, mood).
- Automatic mood shifts based on recent message sentiment and explicit user prompts.
- Modular UI based on shadcn-ui primitives for rapid extension.
- TypeScript throughout for safety and clarity.
- Supabase edge functions for secure server-side logic (no service role key leakage to client).

## 3. Architecture & Flow

```
User (Browser) ──► React Chat UI ──► POST /functions/v1/chat (Supabase Edge Function)
																	 │
																	 ├─► Supabase (companion_config table)
																	 ├─► Lovable AI Gateway (LLM inference)
																	 └─► Streams response back (SSE) to UI
```

High-level steps for a chat:

1. Frontend sends `{ userId, messages[] }` to `chat` function.
2. Function loads companion config (or defaults).
3. Mood detection evaluates last ~5 messages, may update stored mood.
4. System prompt assembled with name, personality, mood interpretation.
5. Request proxied to Lovable AI Gateway (`/v1/chat/completions`, streaming).
6. Response body streamed directly to client as `text/event-stream`.

## 4. Tech Stack

- **Runtime / Build:** Vite + TypeScript
- **UI:** React, Tailwind CSS, shadcn-ui component abstractions
- **Backend / BaaS:** Supabase (Postgres, Auth, Edge Functions)
- **AI Inference:** Lovable AI Gateway (Gemini model configured: `google/gemini-2.5-flash`)
- **State & Config:** Supabase table `companion_config`
- **Tooling:** ESLint, PostCSS, Bun/NPM compatibility

## 5. Directory Map

```
supabase/
	functions/
		chat/            # Edge function implementing mood + streaming AI
		call/            # (Placeholder/secondary function)
	migrations/        # SQL migrations for schema
src/
	pages/             # Route-level components (Auth, Chat, Index, NotFound)
	components/
		dashboard/       # Cards, stats, personalization UI
		ui/              # shadcn-ui wrappers/primitives
	hooks/             # Custom hooks (mobile, toast)
	integrations/
		supabase/        # Supabase client + types
	lib/               # Utility helpers (shared.ts, utils.ts)
public/              # Static assets & web manifest
```

## 6. Environment Variables & Secrets

These must be configured in Supabase dashboard (Edge Function environment) and locally (e.g., `.env` or Supabase config).

| Variable                    | Purpose                                 | Scope              |
| --------------------------- | --------------------------------------- | ------------------ |
| `SUPABASE_URL`              | Base URL of Supabase project            | Edge + Frontend    |
| `SUPABASE_ANON_KEY`         | Public anon key for client auth/queries | Frontend only      |
| `SUPABASE_SERVICE_ROLE_KEY` | Elevated key for server-side operations | Edge Function ONLY |
| `LOVABLE_API_KEY`           | Auth token for Lovable AI Gateway       | Edge Function ONLY |

Never expose `SERVICE_ROLE_KEY` or `LOVABLE_API_KEY` to the browser. Use Edge Functions to mediate requests.

## 7. Supabase Schema & Migrations

`companion_config` (per user personalization):

```sql
-- Example schema (inferred from usage)
CREATE TABLE IF NOT EXISTS companion_config (
	user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
	companion_name text NOT NULL DEFAULT 'Alex',
	personality text NOT NULL DEFAULT 'friendly, supportive, and engaging',
	mood text NOT NULL DEFAULT 'supportive',
	updated_at timestamptz NOT NULL DEFAULT now()
);
```

Migrations stored under `supabase/migrations/`. To apply locally:

```sh
supabase migration up
```

To generate a new migration:

```sh
supabase migration new add_field_x
```

## 8. Edge Functions (API Specs)

Base invocation pattern (Supabase hosted):

```
POST https://<PROJECT>.functions.supabase.co/chat
Headers: apikey: <SUPABASE_ANON_KEY>
				 Content-Type: application/json
Body: { "userId": "<uuid>", "messages": [{"role":"user","content":"Hello"}] }
```

### 8.1 `chat` Function

Path (via Supabase): `/functions/v1/chat`

Request Body:

```json
{
  "userId": "<uuid>",
  "messages": [
    { "role": "user", "content": "hi" },
    { "role": "assistant", "content": "hello there" }
  ]
}
```

Response (Success): `text/event-stream` (LLM tokens as SSE data events)

Response (Errors JSON):

```json
{ "error": "Rate limit exceeded." }
```

Error codes mapped:

- `429` Rate limiting (LLM upstream)
- `402` Payment required (upstream billing)
- Other: `AI gateway error.` or configuration error message

### 8.2 `call` Function

Currently placeholder (refer to `supabase/functions/call/index.ts` when implemented). Document expected contract similarly.

## 9. Chat Function Detailed Walkthrough

File: `supabase/functions/chat/index.ts`
Core steps:

1. CORS preflight handled for `OPTIONS`.
2. Parse `messages` & `userId` from JSON body.
3. Load secrets: `LOVABLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Instantiate Supabase client (service role for mood update capability).
5. Fetch companion config row; fall back to defaults if missing.
6. Run `detectMood(messages, currentMood)` to determine new mood.
7. If mood changed, persist update.
8. Construct `systemPrompt` with:
   - Companion name
   - Personality traits
   - Current mood description + tone hints
   - Safety instructions (no insults)
9. Forward request to Lovable AI Gateway (`/v1/chat/completions`, `stream: true`).
10. Handle error branches; map upstream status to user-friendly message.
11. Stream response body directly to client.

## 10. Mood Detection Logic

Function: `detectMood(messages, currentMood)`
Heuristics:

- Explicit pattern: `change your mood to <mood>` overrides all.
- Keyword buckets → mood mapping:
  - Contains `sad|upset` → `empathetic`
  - `excited|amazing` → `excited`
  - Short question (`?` and < 100 chars) → `curious`
  - `relax|calm` → `calm`
  - `fun|joke` → `playful`
  - `think|understand` → `thoughtful`
  - Offensive token regex `(stupid|idiot|hate|angry|dumb)` → `angry`
- Random slight uplift: `Math.random() > 0.7` → `happy`
- Default fallback → `supportive`

Safety: Even in `angry` mood, instructions enforce non-insulting tone.

## 11. Personalization Model

Stored fields:

- `companion_name`: Display & prompt identity.
- `personality`: Comma-separated trait description appended to system prompt.
- `mood`: Current dynamic tone state.
  Extendable by adding columns (e.g., `language_preference`, `boundaries`). Update system prompt assembly accordingly.

## 12. UI Components Inventory

Located in `src/components/ui/` & `src/components/dashboard/`.
Examples:

- `PersonalizationDialog.tsx` – modify companion settings.
- `MoodIndicator.tsx` – visual mood state.
- `RecentChats.tsx` – list previous or current session messages.
- `StatsCard.tsx` – engagement metrics placeholder.
- Base primitives: `button.tsx`, `dialog.tsx`, `card.tsx`, `input.tsx`, etc., from shadcn-ui wrappers.

## 13. Local Development

Prerequisites: Node 18+ (or Bun), Supabase CLI.

```sh
# Install dependencies
npm install
# or
bun install

# Start Vite dev server
npm run dev
# or
bun run dev

# Start Supabase local stack (if using local services)


# Deploy edge function (example)
supabase functions deploy chat
```

Frontend config should include `SUPABASE_URL` + `SUPABASE_ANON_KEY` (e.g., `.env` consumed in client initialization inside `src/integrations/supabase/client.ts`).

## 14. Deployment

### Vercel

- `vercel.json` present for configuration; deploy via `vercel` CLI or Lovable Publish.
- Set environment variables in Vercel dashboard (never commit `.env`).

### Lovable Publish

Use UI: Share → Publish. Then connect custom domain under Settings → Domains.

### Supabase Edge Functions

Deploy:

```sh
supabase functions deploy chat --project-ref <PROJECT_REF>
```

Invoke test:

```sh
supabase functions invoke chat --body '{"userId":"<uuid>","messages":[{"role":"user","content":"hi"}]}'
```

## 15. Security & Data Protection

- Restrict service role key to Edge Functions only.
- Validate `userId` matches authenticated session (future improvement: verify JWT from Supabase Auth header).
- Sanitize user content if adding persistence for message history.
- Apply rate limiting (LLM upstream already may send 429; add custom guard if needed).
- Log responsibly: avoid storing sensitive user message content long-term.

## 16. LLM Context Guide (For Model Ingestion)

If an external LLM (e.g., indexing assistant) loads this README, key concepts it must retain:

1. Purpose: Mood-adaptive AI companion chat app.
2. Core function: `supabase/functions/chat/index.ts` streaming AI responses.
3. Env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`.
4. Data model: `companion_config` table with `companion_name`, `personality`, `mood`.
5. Mood logic keywords & fallback order.
6. System prompt structure (name + personality + mood + safety).
7. API spec for `/functions/v1/chat` (request shape, streaming response).
8. Safety constraints (no insults even when angry).
9. Extension points: Add new moods, traits, persistent histories.
10. Deployment paths (Vercel, Lovable, Supabase Functions).

### Suggested System Prompt Template (Reference)

```
You are <companion_name>, an AI best friend with a <personality> personality.
Your current mood is <mood> - <description>.
When you speak, <toneHint>.
Be expressive but NEVER insulting or unsafe.
Avoid saying you're an AI. Keep replies concise unless depth requested.
```

## 17. Troubleshooting

| Issue                    | Cause                            | Fix                                                     |
| ------------------------ | -------------------------------- | ------------------------------------------------------- |
| 500 error from chat      | Missing env var                  | Ensure `LOVABLE_API_KEY`, Supabase keys set in Edge env |
| 429 response             | Upstream rate limit              | Backoff/retry or upgrade plan                           |
| Mood never changes       | Weak keyword presence            | Add more heuristics or refine detection                 |
| Streaming not working    | Incorrect headers                | Ensure `text/event-stream` response maintained          |
| Unauthorized data access | Using service role key in client | Move logic to Edge function                             |

## 18. Roadmap / Extensibility

- Add authentication gating for chat endpoint (JWT validation).
- Persist full chat history per user for analytics & continuity.
- Advanced mood model (sentiment + semantic classification via embedding).
- User-configurable mood boundaries (disable certain moods).
- Multi-language support (store `preferred_language`).
- Observability: structured logging, tracing.
- Rate limiting middleware in edge function.

---

## Quick Start (Concise)

```sh
git clone https://github.com/biplabroy-1/AI-companion.git
cd AI-companion
npm install
npm run dev
```

Set env vars before invoking chat function.

---

Feel free to extend this README as features evolve. Contributions welcome!
