# HookStep AI

HookStep AI analyzes a dance clip with browser pose estimation, matches the movement to a curated hook-step dataset, and finds a playable YouTube song result.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/dance-hook-ai` — the user-facing React/Vite analysis studio and hook-step library.
- `artifacts/api-server/src/routes/hook-steps.ts` — curated movement classes and song associations.
- `artifacts/api-server/src/routes/youtube.ts` — YouTube Data API search and relevance ranking.
- `lib/api-spec/openapi.yaml` — source of truth for the generated API hooks and schemas.
- `artifacts/dance-hook-ai/src/lib/pose-analysis.ts` — browser MediaPipe pose sampling and motion signature ranking.

## Architecture decisions

- The first classifier is intentionally curated: pose motion is ranked against known hook-step classes instead of pretending to identify arbitrary songs.
- Video bytes stay in the browser for this first version; only the selected song query reaches the API server.
- YouTube credentials are accessed through the Replit-managed connector, and the browser receives only ranked public video metadata.
- Pose estimation runs on sampled frames and reports tracked-frame confidence before searching YouTube.

## Product

Users can upload a video, record from a camera, or load a demo clip; inspect the movement pipeline, review a hook-step/song match, browse the curated signal bank, and play a ranked YouTube result in an embedded player.

## User preferences

The product should remain AI-first and transparent about the curated dataset and confidence score.

## Gotchas

- Real clip analysis needs a modern browser, a decodable video, and the dancer fully in frame so MediaPipe can track enough landmarks.
- YouTube search is subject to the connected account's API quota and YouTube embed availability.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
