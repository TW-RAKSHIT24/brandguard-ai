# BrandGuard AI

**Create freely. Publish confidently. Stay on brand.**

BrandGuard is a content review MVP: add approved brand guidance, submit a draft, inspect AI findings with source citations and suggested corrections, then record a human approval decision.

## Run locally

1. Use Node.js 20.9 or newer.
2. Install packages with `npm install`.
3. Optionally copy `.env.example` to `.env.local` and add a chat-completion API key and an embeddings API key. Both endpoints use the OpenAI-compatible `/chat/completions` and `/embeddings` routes.
4. Start the app with `npm run dev`, then open `http://localhost:3000`.

Choose an **AI review** to use the configured language model and embeddings provider. The app does not fabricate AI results; missing configuration or provider failures are reported explicitly.

You can run a **Local rules scan** without API keys. This is a deterministic check for recognizable terms in your uploaded guidelines (for example, “Use X instead of Y” and rules against guarantees); it is not AI, does not provide semantic review, and can miss issues. Results identify themselves as local scans and still require human approval.

## Try the complete local demo

1. Open **Brand library** and select **Try sample rules** (or upload your own `.txt`/`.md` guide).
2. Select **New review**, then **Load sample draft**.
3. Choose **Local rules scan** and run the review.
4. Inspect the cited findings, apply a correction, and record a human approval or request for changes.
5. Open **Review history** or **Analytics** to see the saved browser-workspace result.

## MVP scope and data

- Add brand sources as `.txt` or `.md` files in Brand Library. File text and review history are currently stored in this browser's local storage; use the same browser profile to see them again.
- Local rule scans and the rest of the review workflow work without external services once you add at least one text or Markdown guideline.
- The review API creates embeddings, retrieves the closest source passages, sends those passages to the configured LLM, and rejects citations that do not exactly match the retrieved evidence.
- The API keeps all provider keys server-side. Do not expose them through `NEXT_PUBLIC_*` variables.
- Approval is a human-operated UI action. AI recommendations never publish content.

This is a hackathon prototype, not a multi-user deployment: Supabase persistence/storage and email/password authentication are not wired yet. Do not use the local browser storage mode for sensitive or shared production workspaces.

## Commands

- `npm run dev` — local development server
- `npm run lint` — ESLint
- `npx tsc --noEmit` — TypeScript check
- `npm run build` — production build
