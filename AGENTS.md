# AGENTS.md

## Overview

This repository is a full-stack Todo app template built with Next.js App Router, Elysia, Prisma, Better Auth, and Bun.

Use this file as the main Codex entrypoint for project context. Read `docs/ARCHITECTURE.md` before making structural changes.

## Read Order

1. `AGENTS.md`
2. `docs/ARCHITECTURE.md`
3. `prisma/schema.prisma` when changing data models
4. Relevant skill docs under `.agents/skills/*/SKILL.md` for Prisma-related work
5. `CLAUDE.md` and `.chief/**` only when you need to stay aligned with the existing Claude/chief-agent workflow

## Development Commands

```bash
bun run dev
bun run dev:frontend
bun run dev:server
bun run start
bun run build
bun run build:all
bun run test
bunx tsc --noEmit
bun run db:generate
bun run db:push
bun run db:seed-admin
bun run db:studio
```

## Project Rules

- Use Bun for project scripts and local workflows.
- Keep imports on the existing aliases: `#server/*`, `#generated/*`, `#/*`.
- Keep UI routing in the Next.js App Router under `app/`.
- Keep browser API calls on same-origin `/api/*` and let Next.js rewrites proxy them to the Elysia server.
- Treat `prisma/schema.prisma` as the single source of truth for Prisma-managed model types and PostgreSQL structure.
- Do not hand-write `t.Object({...})` schemas for Prisma-backed entities. Use generated prismabox schemas and derive variants with `t.Pick` / `t.Partial`.
- Do not duplicate backend response types on the frontend. Infer them from Eden Treaty.
- Keep `server/index.ts` as the API composition root. Wire services in `server/context/app-context.ts`.
- Use the auth macro with `{ withAuth: true }` and `{ withRole: 'ADMIN' }` on protected routes instead of inline auth checks.
- Services and repositories receive `appContext` and use its logger. Do not add `console.log`.
- Keep backend domain code inside `server/modules/<name>/`.
- Keep frontend feature code inside `app/features/<name>/`. Shared UI stays in `app/components/`.
- After changing Prisma schema, run `bun run db:generate` before typecheck or tests.
- Treat `generated/` as generated output. Recreate it from the schema instead of editing it manually.

## AI Tooling

- Codex-specific project guidance lives in `AGENTS.md`.
- Reusable Codex skills live in `.agents/skills/`.
- Claude-specific guidance remains in `CLAUDE.md`, `.claude/`, and `.chief/`.
- The application code is independent of both agent setups.
