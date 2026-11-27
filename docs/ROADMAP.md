# Life OS — Phased Development Roadmap

> Each phase has clear acceptance criteria. Phases are sequential; each builds on the previous.
> Updated with Product Owner adjustments: Next.js 16 stable, configurable AI provider, deterministic scoring, strict admin privacy isolation, and preserved v1 scope (in-app reminders, JSON export, account deletion).

---

## Phase 0 · Project Scaffold, Tooling & Baseline Infrastructure (Current Phase)
**Duration:** 1–2 days

### Deliverables
- [x] Review academic laboratory PDFs and UML diagrams
- [x] Consolidate requirements into `docs/SPEC.md`
- [x] Design system architecture and PostgreSQL schema in `docs/ARCHITECTURE.md`
- [x] Establish engineering instructions in `AGENTS.md`
- [ ] Initialize Next.js 16 (App Router, stable) with React 19, TypeScript 5+, Tailwind CSS, ESLint, Prettier
- [ ] Set up project directory structure according to ARCHITECTURE.md §3
- [ ] Configure environment variable templates (`.env.example`) including configurable AI provider (`AI_PROVIDER`, `AI_MODEL`)
- [ ] Install shadcn/ui foundation primitives as an unstyled headless base
- [ ] Set up baseline Supabase client utilities (`lib/supabase/client.ts`, `server.ts`, `admin.ts`)
- [ ] Verify baseline build (`pnpm build`, `pnpm lint`, `pnpm type-check`)
- [ ] Stop and report baseline results for explicit Product Owner review before starting Phase 1

### Acceptance Criteria
- `pnpm dev` starts the Next.js 16 server without errors
- `pnpm build` compiles successfully
- TypeScript strict mode passes with 0 errors
- Environment templates are documented and ready
- **No unapproved frontend design or visual theming is finalized**

---

## Phase 1 · Authentication, Privacy & Account Lifecycle
**Duration:** 2–3 days (Completed)

### Deliverables
- [x] **Registration page** — email/password sign-up (FR-1.1)
- [x] **Login page** — email/password sign-in with error handling (FR-1.2, FR-1.3)
- [x] **Logout** — session termination and token revocation (FR-1.4)
- [x] **Privacy Settings page** — granular toggles for life-area context sharing with AI (FR-1.5)
- [x] **Account Deletion & Data Purge** — GDPR compliant self-service account deletion (FR-1.6, preserved in v1)
- [x] **Authenticated Shell Skeleton** — navigation skeleton with Berserk-inspired visual system
- [x] **Auth Middleware & Proxy** — route protection for `/(dashboard)` and strict role verification for `/admin`
- [x] **Zod Validation Schemas** for authentication and profile management

### Acceptance Criteria
- [x] New user can register, log in, view dashboard shell, and log out
- [x] Invalid credentials display clear user-friendly errors
- [x] Privacy settings persist to `profiles.privacy_settings`
- [x] User can execute complete account deletion, cascading through all personal records
- [x] Unauthenticated requests redirect to `/login`

---

## Phase 2 · Goals, Tasks, Habits & Dashboard
**Duration:** 4–5 days (Completed)

### Visual Design System (Product Owner Approved)
- **Aesthetic:** Dark Berserk-inspired atmospheric medieval-fantasy SaaS.
- **Palette:** Near-black (`#080808`), Charcoal surfaces (`#111111`, `#141414`), Deep crimson accent (`#8B0D18`), Warm off-white text (`#ECE7E0`), Antique gold accent (`#A39168`).
- **Signature Elements:** Celestial eclipse header flare, crescent eclipse branding, 6-card bento grid with custom Recharts area visualizer, circular radial habit completion gauge, 7-day square mini streak bars.

### Deliverables
- [x] **Goals CRUD** — create, edit, delete goals with deadlines, category, and progress slider (FR-2.3)
- [x] **Tasks CRUD** — create, edit, delete tasks with priority, status, due date, and goal linkage (FR-2.4)
- [x] **Habits CRUD** — create, edit, delete habits with frequency and target count (FR-2.5)
- [x] **Habit Streak Engine** — deterministic calculation of current streak and preservation of longest streak (FR-2.6)
- [x] **Personalized Dashboard Layout** — aggregated bento-grid summary view:
  - Active goals progress overview
  - Daily tasks and overdue alert count
  - Habit consistency circular gauge and active streaks
  - Weekly activity area chart (Recharts)
  - Upcoming deadlines
  - Task completion metrics
  - Quick action entries
- [x] **Optimistic UI & Cache Synchronization** — instant checkbox toggling and habit logging with automatic server sync

### Acceptance Criteria
- [x] User can link tasks to goals and update goal progress
- [x] Habit streak logic accurately calculates consecutive daily/weekly completions (tested via Vitest)
- [x] Dashboard aggregates data across productivity modules within ≤ 3 seconds (NFR-P1)
- [x] Strict RLS prevents cross-user data leakage
- [x] Responsive layout verified across desktop and mobile screens
- [x] Production build passes (`pnpm build`, `pnpm lint`, `pnpm type-check`, `pnpm test`)

---

## Phase 3 · Finance, Health, Career, Relationships & Calendar/Reminders (implementation complete; database and browser QA pending)
**Duration:** 5–7 days

### 3a · Personal Finance (2 days)
- [x] **Transactions management** — log income/expenses with category, amount, date (FR-3.3)
- [x] **Budget limits** — category monthly limits with configurable alert threshold (FR-3.4)
- [x] **Budget alert logic** — in-app notification when threshold is crossed
- [x] **Spending summary** — income vs. expense and category breakdown in INR (FR-3.5)

### 3b · Health & Fitness (1 day)
- [x] **Activity logs** — log exercise type, duration, calories burned, sleep, and fitness metrics (FR-3.1)
- [x] **Fitness summaries** — monthly totals and four-week exercise trend (FR-3.2)

### 3c · Career, Education & Business (1 day)
- [x] **Career item management** — skills, certifications, milestones, courses, applications, projects, business ideas, grades and study plans (FR-4.1–4.3)
- [x] **Goal linkage** — link career items to overarching goals (FR-4.4)

### 3d · Relationships (1 day)
- [x] **Contacts management** — relationship type, tags, notes (FR-5.1)
- [x] **Interaction logs** — history of calls, meetings, notes (FR-5.2)

### 3e · Calendar & In-App Reminders (1–2 days)
- [x] **Calendar events** — start/end time, all-day flag, daily/weekly/monthly recurrence (FR-5.3)
- [x] **In-App Reminders (Preserved in v1)** — reminders linked to events, tasks, and contacts (FR-5.4, FR-8.1)
- [x] **Reminder delivery** — atomic database claim and 30-second in-app polling while the app is open

### Acceptance Criteria (Phase 3)
- [x] All 5 life-area modules have implemented CRUD interfaces and validation
- [ ] Budget alert fires in-app notification when spending exceeds threshold — basic live Phase 3 testing completed; exact threshold and duplicate behavior still need a dedicated check
- [ ] In-app reminders trigger reliably within 1 minute of scheduled time (NFR-P4) — basic live Phase 3 testing completed; timed delivery and catch-up still need a dedicated check
- [ ] Strict RLS verified across all 5 modules — policies exist in the initial migration; live cross-user test pending

### Phase 3 checkpoint
- Phase 3 migration was applied successfully to the configured Supabase project. Basic live functionality across the Phase 3 modules was manually tested by the Product Owner.
- Prior checkpoint: 39 tests, lint, TypeScript, and production build passed.
- Dedicated timed reminder and two-account privacy checks remain open.

---

## Phase 4 · Analytics, Notifications, Admin & Data Export
**Duration:** 3–4 days

### 4a · Analytics & Basic JSON Data Export (2 days)
- [x] **Analytics visual trends** (Recharts): goal/task, habit, finance, health/sleep, career and relationship trends from user records (FR-6.1–6.3)
- [x] **Basic JSON Data Export (Preserved in v1)** — downloadable analytics report and allowlisted personal user data (FR-6.4)
- [x] **Filter controls** — weekly/monthly/yearly windows, custom dates, life-area views and finance/goal category

### 4b · In-App Notifications Center (0.5 day)
- [x] **Notifications dropdown & page** — unread count, read/unread and mark-all controls, budget alerts, scheduled reminders, task deadlines and event notices (FR-8.1)

### 4c · Administrator Functionality & Strict Privacy Isolation (1.5 days)
- [x] **Admin portal** — middleware, layout and API role verification (`role === 'admin'`)
- [x] **User account lifecycle** — list account metadata, toggle active/disabled status, process account removal (ADM-2)
- [x] **System settings** — registration and maintenance flags (ADM-3)
- [x] **Audit log viewer** — filterable administrative and authentication audit actions (ADM-4)
- [x] **System metrics** — account counts, recent app presence and 30-day login failure rate (ADM-5 simplified metric)
- [ ] **Strict Privacy Verification (ADM-PRIV)** — static regression test checks private RLS policies are owner-only; live two-account/admin isolation test pending

### Acceptance Criteria (Phase 4)
- [ ] Basic JSON export generates a valid downloadable archive of all user data — implementation and allowlist test complete; live download pending
- [ ] In-app notification center displays budget alerts and reminders accurately — implementation complete; live timing/catch-up check pending
- [ ] Admin user management operates smoothly without RLS read access to private user records — implementation complete; live admin/two-account check pending
- [ ] Non-admin access to `/admin` returns HTTP 403 Forbidden — middleware implemented; live HTTP check pending

### Phase 4 continuation checkpoint
- Automated verification of the Phase 4 source: `pnpm test` (64 passing tests), `pnpm lint` (clean), `pnpm type-check` (clean), and `pnpm build` (production build passed). The build required write access to generated `.next` folders in the Windows workspace.
- Apply only `supabase/migrations/20261117000002_phase4_notifications.sql` to the existing project before using Phase 4 against the live database. It adds notification deduplication, app presence, system flags and completion timestamps; earlier migrations remain untouched. Pre-existing completed goal/career timestamps are backfilled from `updated_at` as the best available historical approximation.
- In-app notification polling runs every 30 seconds while the dashboard is open; scheduled Phase 3 reminders are claimed from the database on polling and catch up on reopening. Task/event automatic notices cover a seven-day catch-up window. No external scheduler is required for in-app delivery.
- The admin metric labelled login failure rate covers recorded login attempts, not all application errors. Recent app presence covers users whose notification poll ran in the previous two minutes, not every open browser session.
- Live QA after migration: export JSON and inspect record counts; test a budget threshold and repeat poll for duplicates; verify task/event/follow-up reminders and reopening after missed reminders; use two standard accounts plus one admin account to verify private RLS, account controls, maintenance mode, registration setting and `/admin` 403; inspect charts on mobile and test month/year boundaries.

---

## Phase 5 · AI Decision Support: Deterministic Scoring & Qualitative AI
**Duration:** 4–5 days

> **Phase 5 implementation:** Gemini and OpenAI adapters use HTTPS endpoints, strict response validation, 25-second timeouts and streamed output. The OpenAI adapter uses JSON-schema response formatting through native `fetch` rather than adding an SDK dependency. The scoring engine handles cost inversion, hard exclusions, soft penalties, ordinal inputs, ties and weight sensitivity. Model responses never set scores or rankings.

### Deliverables
- [x] **Decision list & history** — saved drafts, evaluations, versions and current state (FR-7.7)
- [x] **Structured decision wizard** — problem, alternatives, weighted criteria, scores, constraints, privacy review and explicit context consent (FR-7.1–7.3)
- [x] **Deterministic scoring engine** — normalized weights, benefit/cost handling, hard/soft constraints, ordinal mapping, ranking, ties and sensitivity (FR-7.5a)
- [x] **Configurable AI evaluation** — Gemini, OpenAI and explicitly simulated mock; strict structured response, token stream, timeout, failure recovery and per-user quota (FR-7.4–7.5b)
- [x] **Results view** — ranked scores, weighted breakdown, comparison matrix and chart, sensitivity, strengths/weaknesses, risks, uncertainty, next steps and advisory label (FR-7.8)
- [x] **Revision loop & lifecycle** — DRAFT → CRITERIA_DEFINED → CONTEXT_ATTACHED → EVALUATING → EVALUATED → CLOSED; revise/reopen, immutable evaluation versions and saved final choices (FR-7.6–7.7)
- [x] **Dashboard and data export** — recent decision summaries and personal decision history in the authenticated JSON export

### Acceptance Criteria (Phase 5)
- [x] Deterministic scoring produces repeatable mathematical rankings in automated tests
- [ ] AI reasoning provides qualitative trade-offs within 30 seconds — schema, streaming and 25-second provider timeout implemented; live provider QA pending
- [ ] Configurable AI provider functions live — mock and transport tests pass; live Gemini/OpenAI calls not tested
- [ ] Personal context obeys server-side privacy toggles — unit gate tested; live two-account/privacy check pending
- [ ] Version history persists and displays — source complete; live database QA pending

### Phase 5 continuation checkpoint
- Automated verification: `pnpm test` passed 78 tests; `pnpm lint` and `pnpm type-check` passed. `pnpm build` passed with `LIFE_OS_BUILD_DIR=.next-phase5-check` and `LIFE_OS_SINGLE_PROCESS_BUILD=1` before a final one-line recovery-screen navigation fix; TypeScript passed after that fix. Rebuild attempts of the final state with default and alternate generated directories hit intermittent Windows sandbox `EPERM` while creating Next.js route folders, including during prerender. A final-state production build remains unverified; no application source error was reported by the failing attempts.
- Apply only `supabase/migrations/20261117000003_phase5_decisions.sql` to the configured project before live Phase 5 testing. It adds editable input/evaluation snapshots, transition enforcement, synchronized current alternatives/criteria, unique versions, final-choice history and a 10-per-hour external AI quota. Earlier migrations remain untouched. No remote migration or deployment was performed.
- For free local QA, configure `AI_PROVIDER=mock` in the server environment; mock results are clearly labelled simulated. Live qualitative AI requires `AI_PROVIDER=gemini` with `GEMINI_API_KEY`, or `AI_PROVIDER=openai` with `OPENAI_API_KEY`; `AI_MODEL` is optional. Missing keys and invalid provider responses fail visibly without fabricated fallback results.
- Live QA after migration: save a draft; score benefit/cost criteria and hard/soft constraints; prepare privacy-permitted context with consent; evaluate in mock mode; revise and compare versions; close and reopen; check dashboard and JSON export; test another account's access; retry an interrupted evaluation after 90 seconds. Live provider latency and output quality remain unverified.

---
## Phase 6 · Hardening, End-to-End Testing & Deployment
**Duration:** 2–3 days

### Deliverables
- [ ] **Playwright E2E Test Suite**:
  - Auth → Profile → Goals/Tasks CRUD flow
  - Budget alert → In-app notification flow
  - Decision problem → Deterministic ranking + AI evaluation flow
  - Admin access control & privacy boundary verification
- [ ] **Vitest Unit & Integration Test Suite**:
  - Deterministic scoring engine (100% target coverage)
  - Streak calculation engine (100% target coverage)
  - API route validation schemas
- [ ] **Security & Performance Hardening**:
  - OWASP ZAP baseline security audit
  - Rate limiting on auth and AI decision routes
  - Lighthouse audit (performance, accessibility, SEO ≥ 80)
- [ ] **Production Deployment**:
  - Vercel deployment with environment variables configured
  - README documentation with setup and demo guidelines

---

## Preserved v1 vs. Deferred to v2 Summary

### ✅ Preserved in v1:
- All 11 core modules
- In-app reminders and notifications (FR-5.4, FR-8.1)
- Basic JSON personal data export (FR-6.4)
- Account deletion and complete data purge (FR-1.6)
- Deterministic weighted scoring for decision rankings (FR-7.5)
- Strict admin privacy isolation (ADM-PRIV)

### 🔜 Explicitly Deferred to v2:
| Feature | SRS Reference | Notes |
|---|---|---|
| Google Calendar / CalDAV sync | FR-8.2 | Deferred to avoid external OAuth complexity |
| Health & wearable API sync | FR-8.3 | Deferred to v2 |
| Push / email notifications | FR-8.1 | In-app notification center covers v1 |
| Formatted PDF/CSV report export | FR-6.4 | Basic JSON export provided in v1 |
| Native mobile applications | NFR-P7 | Responsive Next.js PWA covers mobile in v1 |
| Full infrastructure monitoring | ADM-5 | Basic operational metrics provided in v1 |
