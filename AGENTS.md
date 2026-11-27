# AGENTS.md — Life OS Engineering Instructions

> Persistent instructions for all AI coding sessions on this project.
> Every agent working on Life OS MUST read this file before making changes.

---

## 1 · Project Identity

- **Name:** Life OS — Integrated Personal Life-Management Platform with Intelligent AI Decision Support
- **Origin:** MediCaps University, SE Lab (CS3CO40P), six experiment PDFs in `docs/`
- **Type:** Full-stack web application (portfolio-grade, academically grounded)

---

## 2 · Source of Truth

1. **`docs/SPEC.md`** — Consolidated product requirements (functional + non-functional)
2. **`docs/ARCHITECTURE.md`** — System architecture, database schema, API design
3. **`docs/ROADMAP.md`** — Phased development plan with acceptance criteria
4. **`docs/*.pdf`** — Original academic UML diagrams (use case, activity, swimlane, state, sequence, collaboration, component, deployment)

When in doubt, SPEC.md overrides any agent's assumptions. The PDFs are the ultimate source; SPEC.md is the consolidated interpretation.

---

## 3 · Technology Stack (Locked)

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, stable) | React 19, Server Components by default |
| Language | TypeScript 5+ (strict mode) | No `any` types; prefer `unknown` + narrowing |
| Database | PostgreSQL via Supabase | All schema in `supabase/migrations/` |
| Auth | Supabase Auth | Email/password; JWT; never build custom auth |
| Styling | Tailwind CSS + shadcn/ui foundation | shadcn/ui component primitives; theme/styling locked pending PO approval |
| Charts | Recharts | For analytics module only |
| AI | Configurable Provider (Gemini initial) | Configurable via `AI_PROVIDER` & `AI_MODEL` env vars; `@google/genai` / SDK |
| Validation | Zod | Shared schemas for client + server |
| State | TanStack Query + React Context | No Redux, no Zustand |
| Deployment | Vercel | Automatic from `main` branch |
| Package Manager | pnpm | Not npm, not yarn |

Do NOT introduce new dependencies without justification in a comment or PR description.

---

## 4 · Coding Standards

### 4.1 File Organization
```
src/
├── app/              # Next.js App Router pages and layouts
├── components/       # React components
│   ├── ui/           # shadcn/ui primitives (foundation only; do not style arbitrarily)
│   ├── layout/       # Shell, sidebar, topbar
│   ├── charts/       # Recharts wrappers
│   ├── forms/        # Reusable form patterns
│   └── [module]/     # Module-specific components (e.g., components/goals/)
├── lib/              # Server-side utilities and integrations
│   ├── supabase/     # Supabase client (client.ts, server.ts, admin.ts)
│   ├── ai/           # Configurable AI service integration (Gemini, etc.)
│   ├── decision/     # Deterministic scoring engine & decision algorithms
│   ├── validators/   # Zod schemas (shared client+server)
│   └── utils/        # Pure utility functions
├── hooks/            # Custom React hooks
├── types/            # TypeScript type definitions
└── middleware.ts     # Auth + admin route protection
```

### 4.2 Naming Conventions
- **Files:** `kebab-case.ts`, `kebab-case.tsx`
- **Components:** `PascalCase` (e.g., `GoalCard`, `DecisionWizard`)
- **Functions/variables:** `camelCase`
- **Database columns:** `snake_case`
- **API routes:** `kebab-case` in URL, handler files in route folders
- **Types/interfaces:** `PascalCase`, prefix interfaces with `I` only if needed to avoid collision
- **Zod schemas:** `camelCaseSchema` (e.g., `createGoalSchema`)

### 4.3 Component Patterns
- Prefer **Server Components** for data-fetching pages
- Use **Client Components** (`'use client'`) only when:
  - Interactivity is needed (forms, buttons, state)
  - Browser APIs are needed
  - TanStack Query hooks are used
- Keep Client Components **small and leaf-level**
- Extract form logic into custom hooks
- Always handle loading, error, and empty states

### 4.4 API Route Patterns
```typescript
// Every API route follows this structure:
export async function GET(request: Request) {
  // 1. Authenticate
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Validate input (if applicable)
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // 3. Database operation (RLS handles authorization)
  const { data, error } = await supabase.from('table').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 4. Return response
  return NextResponse.json(data);
}
```

### 4.5 Error Handling
- API routes: always return proper HTTP status codes with JSON error bodies
- Client: use error boundaries for unexpected errors
- Forms: display inline validation errors via Zod
- AI calls: handle timeouts (30s), rate limits, provider failovers, and API errors gracefully
- Never expose stack traces or internal details in production responses

### 4.6 Database & Privacy-Enforced RLS
- All schema changes go through Supabase migrations (`supabase/migrations/`)
- Never modify the database manually in production
- Every user-owned table MUST have RLS enabled
- Always filter by `user_id` even though RLS provides safety (defense in depth)
- **Strict Privacy Isolation:** Administrators CANNOT access private user records (goals, tasks, habits, health, finance, career, relationships, calendar, decisions) without legitimate user authorization / explicit consent. RLS policies must strictly isolate user records to `auth.uid() = user_id`.
- Admin privileges are restricted to user account management (status, disable), system settings, and audit logs.
- Use parameterized queries (Supabase client does this automatically)
- Index columns used in WHERE, ORDER BY, and JOIN clauses

---

## 5 · Module Implementation Rules

### 5.1 Mandatory Modules (11)

Every module listed below MUST be implemented in v1. Do not skip, merge, or remove any:

1. **Authentication & Privacy** — FR-1.x (includes login, logout, privacy controls, account deletion/purge)
2. **Personalized Dashboard** — FR-2.1–2.2
3. **Goals, Tasks & Habits** — FR-2.3–2.6
4. **Personal Finance** — FR-3.3–3.5
5. **Health & Fitness** — FR-3.1–3.2
6. **Career, Education & Business** — FR-4.1–4.4
7. **Relationships** — FR-5.1–5.2
8. **Calendar & Reminders** — FR-5.3–5.4 (includes in-app reminders)
9. **Analytics & Reports** — FR-6.1–6.4 (includes basic JSON data export in v1)
10. **AI Decision Support** — FR-7.1–7.8 (signature feature)
11. **Administrator Functionality** — ADM-1–5 (administrative tasks only, no unauthorized snooping on private data)

### 5.2 Simplification Rules
- You MAY simplify the UI or reduce the number of fields within a module
- You MUST NOT remove a module entirely
- You MUST NOT silently skip a mandatory requirement
- If a feature cannot be implemented, document why and propose an alternative
- Clearly mark any simplification with a `// SIMPLIFIED: <reason>` comment

### 5.3 AI Decision Support (Signature Feature & Deterministic Scoring)
This is the signature feature. It must implement:
- Structured problem input (not just a chat prompt)
- Multiple alternatives (≥ 2)
- Weighted criteria with constraints
- **Deterministic Weighted Scoring Algorithm:** Mathematical ranking calculation based on criteria weights and alternative criterion scores:
  $$\text{Score}(A_i) = \sum_{j=1}^{m} w_j \cdot s_{ij}$$
  ensuring ranking repeatability, objectivity, and transparent calculation.
- **AI-Generated Reasoning:** The AI provides qualitative reasoning, trade-off analysis, pros/cons, and constraint sensitivity explanation.
- Revision loop (edit criteria/weights and re-evaluate)
- Full decision history persistence
- Advisory labelling (user retains final decision authority)
- Privacy-gated context attachment

---

## 6 · Security & Privacy Rules

- Never commit API keys or secrets to Git
- Always use environment variables for credentials
- Supabase service role key: server-side only, never expose to client
- All user data access must go through Supabase client (RLS-enforced)
- **Admin Record Isolation:** Admin users must NOT have RLS bypass or read access to private user records (health logs, financial transactions, relationships, personal goals, decisions) without explicit legitimate authorization/consent.
- Admin routes: verify `profile.role === 'admin'` in both middleware and API; admin operations operate strictly on user administration, system config, and audit logs.
- AI service calls: sanitize user input, apply rate limiting, filter context through user privacy toggles
- User Data Rights: Support basic JSON data export and account deletion (right to be forgotten) in v1.
- HTTPS is enforced by Vercel (NFR-SEC4)

---

## 7 · Git Workflow

- **Branch:** `main` (production), feature branches from `main`
- **Commits:** Conventional Commits format:
  - `feat(goals): add goal CRUD operations`
  - `fix(auth): handle expired token redirect`
  - `docs: update ROADMAP with phase 2 completion`
- **PR rule:** Every feature branch must pass lint + type check before merge
- **No force push** to `main`

---

## 8 · Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | Deterministic scoring engine, utility functions, Zod schemas, streak logic |
| API Integration | Vitest + Supabase test client | API route handlers |
| E2E | Playwright | Critical user flows (auth, CRUD, AI decision) |
| Component | Vitest + React Testing Library | Complex interactive components |

Minimum coverage targets:
- Decision deterministic scoring algorithm: 100%
- AI decision evaluation logic & schema validation: 90%+
- Streak calculation: 100%
- Budget alert logic: 100%
- API routes: 80%+

---

## 9 · Performance Targets

| Metric | Target | Source |
|---|---|---|
| Page load (LCP) | ≤ 3 seconds | NFR-P1 |
| API response (CRUD) | ≤ 1 second | NFR-P3 |
| AI evaluation | ≤ 30 seconds | NFR-P5 |
| Reminder delivery | ≤ 1 minute | NFR-P4 |
| Lighthouse score | ≥ 80 | Project quality |

---

## 10 · Frontend Design Decisions (Pending Product Owner Approval)

> **IMPORTANT:** Frontend design choices require **explicit product-owner approval** before implementation.

Approved foundation:
- ✅ Next.js 16 App Router
- ✅ Tailwind CSS for styling engine
- ✅ shadcn/ui for component foundation primitives
- ✅ Recharts for analytics charts

**Strictly pending explicit Product Owner approval:**
- ⏳ Final visual design & theme
- ⏳ Color palette and dark/light mode specifics
- ⏳ Typography and font hierarchy
- ⏳ Dashboard widget layout and card arrangement
- ⏳ AI Decision Support wizard UX flow & detailed styling
- ⏳ Mobile navigation pattern

Do NOT finalize or enforce unapproved visual design patterns until explicitly reviewed and approved by the product owner.

---

## 11 · Preserved v1 vs. Deferred Integrations

### Preserved in v1 Scope:
- In-app reminders and notifications (FR-5.4, FR-8.1)
- Basic JSON data export (FR-6.4)
- User account deletion and full data purge (FR-1.6)

### Deferred to v2:
| Feature | Status | SRS Ref |
|---|---|---|
| Google Calendar sync | Deferred v2 | FR-8.2 |
| Wearable API import | Deferred v2 | FR-8.3 |
| Push/email notifications | Deferred v2 | FR-8.1 (external delivery) |
| Formatted PDF/CSV report export | Deferred v2 | FR-6.4 (advanced export) |
| Native mobile apps | Deferred v2 | NFR-P7 |
| Full infrastructure monitoring dashboard | Deferred v2 | ADM-5 |

---

## 12 · Quick Reference

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Production build
pnpm lint                   # ESLint
pnpm type-check             # TypeScript strict check

# Database
pnpm supabase start         # Local Supabase
pnpm supabase db push       # Apply migrations
pnpm supabase gen types     # Generate TypeScript types from DB

# Testing
pnpm test                   # Unit + integration tests
pnpm test:e2e               # Playwright E2E tests

# Deployment
git push origin main        # Auto-deploys to Vercel
```

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
