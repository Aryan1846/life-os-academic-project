# Life OS — System Architecture & Database Design

> Derived from the Component Diagram (Exp 8), Deployment Diagram (Exp 9), Sequence/Collaboration Diagrams (Exp 7), and the consolidated SPEC.md.
> Updated with Product Owner adjustments: Next.js 16 stable, configurable AI provider, deterministic scoring engine, strict admin privacy isolation, and preserved v1 features.

---

## 1 · Technology Stack (Locked & Approved)

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | Next.js 16 (App Router, stable) | React 19, Server Components by default, streaming, standard App Router API routes |
| **Language** | TypeScript 5+ (strict mode) | Strict type safety, no implicit `any`, unified types across frontend and API |
| **Styling Foundation** | Tailwind CSS + shadcn/ui foundation | Utility styling engine + headless primitives. **Theme, palette, typography, and visual styling pending explicit PO approval.** |
| **Charts** | Recharts | Lightweight React-native charting for analytics module (FR-6.2) |
| **Backend & Routing** | Next.js API Routes + Supabase Client | Edge & Node.js serverless handlers with Supabase SSR helpers |
| **Database** | PostgreSQL (via Supabase) | Relational integrity, JSONB for flexible attributes, strict Row-Level Security (RLS) |
| **Auth** | Supabase Auth | Email/password, secure JWT in HTTP-only cookies, session management (FR-1.1–1.4) |
| **AI Layer** | Configurable AI Provider (Gemini initial) | Decoupled abstraction (`lib/ai/`) configurable via `AI_PROVIDER` and `AI_MODEL` env vars |
| **Decision Scoring** | Deterministic Weighted Scoring Engine | Standalone TypeScript engine (`lib/decision/`) for mathematical ranking repeatability |
| **Deployment** | Vercel | Production hosting, automatic HTTPS/TLS 1.3 (NFR-SEC4) |
| **Notifications** | In-app notification center | Realtime and scheduled polling for alerts and reminders (FR-5.4, FR-8.1) |
| **Validation** | Zod | Shared runtime schema validation for forms, APIs, and AI outputs |
| **Package Manager** | pnpm | Fast, deterministic dependency management |

---

## 2 · High-Level Architecture

The architecture maps directly to the Component Diagram (Experiment 8) and Deployment Diagram (Experiment 9):

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                  │
│  ┌───────────────────────────────┐   ┌──────────────────────────────┐  │
│  │   Next.js 16 Web App          │   │   Responsive Mobile (PWA)    │  │
│  │   (React 19 + shadcn foundation)  │   (Tailwind, viewport adaptive)  │  │
│  └───────────────┬───────────────┘   └──────────────┬───────────────┘  │
└──────────────────┼──────────────────────────────────┼──────────────────┘
                   │  HTTPS / REST + JSON             │
                   ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    LIFE OS APPLICATION SERVER                           │
│                   (Next.js 16 Routes on Vercel)                         │
│                                                                         │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐ ┌──────────────┐         │
│  │Auth      │ │Dashboard │ │Goals/Tasks/   │ │Health        │         │
│  │Component │ │Component │ │Habits Component│ │Component     │         │
│  └──────────┘ └──────────┘ └───────────────┘ └──────────────┘         │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐ ┌──────────────┐         │
│  │Finance   │ │Career/   │ │Calendar &     │ │Relationships │         │
│  │Component │ │Business  │ │Reminders      │ │Component     │         │
│  └──────────┘ └──────────┘ └───────────────┘ └──────────────┘         │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐ ┌──────────────┐         │
│  │Analytics │ │Decision  │ │AI Reasoning   │ │Notification  │         │
│  │Component │ │Scoring   │ │Evaluator      │ │Manager       │         │
│  └──────────┘ └──────────┘ └───────────────┘ └──────────────┘         │
│  ┌──────────────────────────────────────────────────────────┐         │
│  │Admin Component (Account lifecycle & audit logs only)     │         │
│  └──────────────────────────────────────────────────────────┘         │
└──────────────────┬──────────────────┬────────────────┬──────────────────┘
                   │                  │                │
           SQL/TLS │       HTTPS API  │       Realtime │
                   ▼                  ▼                ▼
┌─────────────────────┐   ┌────────────────┐   ┌─────────────────────────┐
│   DATABASE          │   │ EXTERNAL       │   │ FUTURE INTEGRATIONS     │
│   (Supabase PG)     │   │ AI SERVICES    │   │ (Deferred to v2)        │
│                     │   │                │   │                         │
│  • User Profiles    │   │ • Google Gemini│   │ • External Calendar API │
│  • Strict User Data │   │   (Default)    │   │   (Google/CalDAV)       │
│  • Deterministic    │   │ • Configurable │   │ • Health/Wearables API  │
│    Decision History │   │   Provider &   │   │ • External Push/Email   │
│  • Admin Audit Logs │   │   Model        │   │   (In-app in v1)        │
└─────────────────────┘   └────────────────┘   └─────────────────────────┘
```

---

## 3 · Application Module & Directory Map

```
src/
├── app/
│   ├── (auth)/                    # Public authentication routes
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/               # Authenticated application shell
│   │   ├── layout.tsx             # Shell navigation (layout pending PO design approval)
│   │   ├── page.tsx               # Personalized dashboard (FR-2.1)
│   │   ├── goals/                 # Goals, tasks, habits (FR-2.3–2.6)
│   │   ├── finance/               # Transactions, budgets, alerts (FR-3.3–3.5)
│   │   ├── health/                # Activity logging & summaries (FR-3.1–3.2)
│   │   ├── career/                # Career, education & business tracking (FR-4.1–4.4)
│   │   ├── relationships/         # Contacts & interaction logs (FR-5.1–5.2)
│   │   ├── calendar/              # Events & reminders (FR-5.3–5.4)
│   │   ├── analytics/             # Reports, trends & JSON export (FR-6.1–6.4)
│   │   ├── decisions/             # Signature AI decision support (FR-7.1–7.8)
│   │   ├── settings/              # Privacy toggles, JSON data export, account deletion
│   │   └── notifications/         # In-app notification center (FR-8.1)
│   ├── admin/                     # Administrator portal (ADM-1–5)
│   │   ├── layout.tsx             # Admin shell with strict role check
│   │   ├── page.tsx               # Admin overview & system metrics
│   │   ├── users/                 # User account management (enable/disable/delete)
│   │   ├── settings/              # System settings & maintenance flags
│   │   └── logs/                  # System audit log viewer
│   └── api/                       # REST API route handlers
│       ├── auth/
│       ├── profile/               # Profile, export (`/export`), deletion (`/delete`)
│       ├── dashboard/
│       ├── goals/
│       ├── tasks/
│       ├── habits/
│       ├── finance/
│       ├── health/
│       ├── career/
│       ├── relationships/
│       ├── calendar/
│       ├── analytics/
│       ├── decisions/
│       ├── notifications/
│       └── admin/
├── components/                    # Component hierarchy
│   ├── ui/                        # Headless shadcn primitives (base foundation)
│   ├── layout/                    # Layout shell, sidebar, topbar (skeletons)
│   ├── charts/                    # Recharts wrappers
│   ├── forms/                     # Form controllers & error displays
│   └── [module]/                  # Module-specific component groups
├── lib/
│   ├── supabase/                  # Server, client, and admin Supabase instances
│   ├── ai/                        # Configurable AI integration (provider abstraction)
│   ├── decision/                  # Deterministic weighted scoring algorithm & state machine
│   ├── validators/                # Zod validation schemas
│   └── utils/                     # Formatting, dates, streaks, error helpers
├── hooks/                         # React hooks (queries, mutations, forms)
├── types/                         # TypeScript interfaces and DB schema types
└── middleware.ts                  # Edge auth middleware & admin protection
```

---

## 4 · Database Schema & Strict Privacy-Enforced RLS

### 4.1 Strict Admin Privacy Isolation (Rule 6)

In compliance with Product Owner requirement 6:
- **No Blanket Admin Access:** Row-Level Security (RLS) on private user data tables (`goals`, `tasks`, `habits`, `habit_logs`, `transactions`, `budgets`, `health_activities`, `career_items`, `contacts`, `interactions`, `events`, `reminders`, `decisions`, `decision_evaluations`, `notifications`) allows **ONLY** the owning user:
  ```sql
  auth.uid() = user_id
  ```
- **Administrators CANNOT read or query private user records** unless the user provides explicit, documented authorization.
- Admin access is restricted strictly to:
  1. `profiles`: Read account metadata (name, email via auth, role, status) to disable or delete accounts upon request.
  2. `system_settings`: Read/write system configuration.
  3. `audit_logs`: Read-only security and operational audit trail.

### 4.2 Database DDL (PostgreSQL)

```sql
-- ============================================================
-- USERS & PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  privacy_settings JSONB NOT NULL DEFAULT '{"share_goals": false, "share_finance": false, "share_health": false, "share_career": false}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- GOALS, TASKS & HABITS
-- ============================================================
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
  target_date DATE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  target_count INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- ============================================================
-- PERSONAL FINANCE
-- ============================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  monthly_limit NUMERIC(12,2) NOT NULL,
  alert_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

-- ============================================================
-- HEALTH & FITNESS
-- ============================================================
CREATE TABLE public.health_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  duration_minutes INTEGER,
  calories_burned INTEGER,
  notes TEXT,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CAREER, EDUCATION & BUSINESS
-- ============================================================
CREATE TABLE public.career_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('skill', 'certification', 'milestone', 'course', 'project', 'idea')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('planned', 'in_progress', 'completed', 'abandoned')),
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RELATIONSHIPS
-- ============================================================
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship_type TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  notes TEXT,
  interaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CALENDAR & REMINDERS (IN-APP PRESERVED IN V1)
-- ============================================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  entity_type TEXT, -- 'event', 'task', 'contact', 'habit'
  entity_id UUID,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AI DECISION SUPPORT & DETERMINISTIC EVALUATIONS
-- ============================================================
CREATE TABLE public.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  problem_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'criteria_defined', 'context_attached', 'awaiting_input', 'evaluating', 'evaluated', 'closed')),
  context_snapshot JSONB,
  final_choice TEXT,
  outcome_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.decision_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.decision_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight NUMERIC(3,2) NOT NULL CHECK (weight BETWEEN 0 AND 1),
  constraint_rule TEXT
);

CREATE TABLE public.decision_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  ai_provider TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  deterministic_scores JSONB NOT NULL, -- { alternative_id: { criterion_id: score, total_score: num, rank: num } }
  ranking JSONB NOT NULL,              -- deterministic ordered list of alternative IDs
  ai_reasoning TEXT NOT NULL,          -- qualitative narrative reasoning
  pros_cons JSONB NOT NULL,            -- { alternative_id: { pros: [...], cons: [...] } }
  trade_off_analysis TEXT,            -- explicit comparative trade-off analysis
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- IN-APP NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'budget_alert', 'reminder', 'task_due', 'system'
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT LOGS & SYSTEM SETTINGS (ADMIN)
-- ============================================================
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.3 Strict Row-Level Security Policies

```sql
-- Enable RLS on ALL tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Users manage own profile; Admins can read profile metadata only (not life data)
CREATE POLICY "Users access own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Admins view user profiles metadata" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. User Life-Area Tables: STRICT USER-ONLY ACCESS (No admin bypass)
CREATE POLICY "Users own goals" ON public.goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own habits" ON public.habits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own habit_logs" ON public.habit_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own health_activities" ON public.health_activities FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own career_items" ON public.career_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own contacts" ON public.contacts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own interactions" ON public.interactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own events" ON public.events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own reminders" ON public.reminders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own decisions" ON public.decisions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own decision_alternatives" ON public.decision_alternatives FOR ALL
  USING (EXISTS (SELECT 1 FROM public.decisions WHERE id = decision_id AND user_id = auth.uid()));
CREATE POLICY "Users own decision_criteria" ON public.decision_criteria FOR ALL
  USING (EXISTS (SELECT 1 FROM public.decisions WHERE id = decision_id AND user_id = auth.uid()));
CREATE POLICY "Users own decision_evaluations" ON public.decision_evaluations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.decisions WHERE id = decision_id AND user_id = auth.uid()));
CREATE POLICY "Users own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- 3. System Settings: All authenticated read; only admins update
CREATE POLICY "Authenticated read settings" ON public.system_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins modify settings" ON public.system_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Audit Logs: Admins read; system writes via service client
CREATE POLICY "Admins read audit logs" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
```

---

## 5 · Signature AI Decision Support: Deterministic Scoring & Qualitative AI Architecture

The decision support architecture is divided into two distinct, rigorous components:

### 5.1 Deterministic Weighted Scoring Engine (`lib/decision/scoring.ts`)
Rankings are calculated **deterministically** via mathematical formula rather than relying on generative model hallucinations:

$$\text{Final Score}(A_i) = \sum_{j=1}^{m} w_j \cdot s_{ij}$$

Where:
- $A_i$: Alternative $i$ ($i \in \{1, \dots, n\}$)
- $C_j$: Criterion $j$ ($j \in \{1, \dots, m\}$)
- $w_j$: Normalized weight of criterion $j$ ($\sum w_j = 1.0$)
- $s_{ij}$: Evaluated score of Alternative $i$ under Criterion $j$ ($s_{ij} \in [0, 10]$)
- Rank 1 is assigned to the alternative with the highest final score.

### 5.2 AI Qualitative Reasoning & Trade-Offs (`lib/ai/decision-evaluator.ts`)
The AI model receives:
1. Decision problem & context snapshot (privacy-permitted only)
2. Alternatives & criteria specifications
3. Criteria scoring evaluations

The AI produces structured qualitative outputs:
- **Reasoning:** In-depth justification for why alternatives performed as they did
- **Pros & Cons:** Concrete advantages and drawbacks for each alternative
- **Trade-Off Analysis:** Explicit comparison between top-ranking alternatives
- **Sensitivity & Caveats:** Critical assumptions or conditions under which ranking would change

### 5.3 Configurable AI Provider Interface
```typescript
export interface AIProviderConfig {
  provider: 'gemini' | 'openai' | 'anthropic';
  model: string;
  apiKey: string;
}

export interface DecisionEvaluationInput {
  problem: string;
  alternatives: { id: string; title: string; description: string }[];
  criteria: { id: string; name: string; weight: number; constraint?: string }[];
  context?: Record<string, unknown>;
}

export interface DecisionEvaluationResult {
  deterministicScores: Record<string, { criterionScores: Record<string, number>; totalScore: number; rank: number }>;
  ranking: { alternativeId: string; rank: number; totalScore: number }[];
  aiReasoning: string;
  prosCons: Record<string, { pros: string[]; cons: string[] }>;
  tradeOffAnalysis: string;
  caveats: string[];
}
```

---

## 6 · Environment Variables Configuration

Template in `.env.example`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Provider Configuration (Configurable)
AI_PROVIDER=gemini # 'gemini' | 'openai' | 'mock'
AI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=your-gemini-api-key

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```
