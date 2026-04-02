# OpsMind AI - Context-Aware Corporate Knowledge Brain

Production-style SaaS app with role-based auth, RAG over SOP PDFs, SSE streaming responses, and premium UI.

## Tech Stack

- Frontend: React + Vite + TailwindCSS + Framer Motion
- Backend: Node.js + Express + MongoDB Atlas
- AI: Gemini 1.5 Flash + text-embedding-004

## Monorepo Structure

- `server/` Express API, auth, RAG pipeline, SSE chat
- `client/` React SaaS UI

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment files:

- copy `server/.env.example` to `server/.env`
- copy `client/.env.example` to `client/.env`

3. Start development:

```bash
npm run dev
```

Server runs on `http://localhost:5000`, client on `http://localhost:5173`.

## Core APIs

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/documents`
- `POST /api/documents` (admin, PDF upload)
- `DELETE /api/documents/:documentId` (admin)
- `POST /api/documents/:documentId/reindex` (admin)
- `GET /api/chat/sessions`
- `GET /api/chat/sessions/:sessionId`
- `POST /api/chat/ask/stream` (SSE)

## Deployment

### Backend

1. Provision MongoDB Atlas cluster.
2. Set all env vars from `server/.env.example`.
3. Deploy `server` on Render/Railway/Fly.io.

### Frontend

1. Set `VITE_API_URL` to deployed backend `/api` URL.
2. Build: `npm run build --workspace client`
3. Deploy `client/dist` to Vercel/Netlify.

## Anti-Hallucination Behavior

- Retrieval is required for answering.
- If retrieval confidence is insufficient/no chunks found, assistant returns exactly:
  `I don't know based on the available SOPs`

