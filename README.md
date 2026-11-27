# Life OS

Life OS is a Next.js 16 and Supabase application for managing goals, tasks, habits, finance, health, career, relationships, calendar events, analytics, and decisions in one private workspace.

The decision-support module ranks alternatives with deterministic weighted scoring. An optional AI provider explains trade-offs and uncertainty; it cannot change scores or rankings. Mock evaluations are labelled as simulated.

## Run locally

1. Install Node.js and pnpm.
2. Copy `.env.example` to `.env.local` and enter credentials for **your own** Supabase project.
3. Run `pnpm install` and `pnpm dev`.
4. Open the URL printed by Next.js, usually `http://localhost:3000`.

Apply the SQL migrations in `supabase/migrations` to the intended Supabase project in order. Do not apply a migration twice. The Phase 5 migration is required for live Decision Support.

## Verification status

The last documented Phase 5 checkpoint passed 78 automated tests, lint, and TypeScript checks. A production build passed before a small final navigation change; subsequent final-state build attempts were blocked by a Windows filesystem permission error. Live Phase 5 database, cross-user privacy, and external AI provider QA remain pending. See `docs/ROADMAP.md` for the exact checkpoint.

Run `pnpm test`, `pnpm lint`, `pnpm type-check`, and `pnpm build` in your environment.

The project presentation is included as `Life-OS-Presentation.pptx`.
