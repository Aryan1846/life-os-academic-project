-- ==============================================================================
-- Life OS — Initial Schema Migration (Refined)
-- Source of Truth: docs/SPEC.md & docs/ARCHITECTURE.md
-- Enforces: 11 Mandatory Modules, Deterministic AI Decision Support,
-- Strict Admin Privacy Isolation, Non-Recursive RLS, Field Privilege Protection,
-- and Cross-Record Ownership Consistency.
-- ==============================================================================

-- 1. PROFILES & USER SETTINGS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  privacy_settings JSONB NOT NULL DEFAULT '{"share_goals": false, "share_finance": false, "share_health": false, "share_career": false}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. GOALS, TASKS & HABITS
CREATE TABLE IF NOT EXISTS public.goals (
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

CREATE TABLE IF NOT EXISTS public.tasks (
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

CREATE TABLE IF NOT EXISTS public.habits (
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

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- 3. PERSONAL FINANCE
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  monthly_limit NUMERIC(12,2) NOT NULL,
  alert_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

-- 4. HEALTH & FITNESS
CREATE TABLE IF NOT EXISTS public.health_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  duration_minutes INTEGER,
  calories_burned INTEGER,
  notes TEXT,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. CAREER, EDUCATION & BUSINESS
CREATE TABLE IF NOT EXISTS public.career_items (
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

-- 6. RELATIONSHIPS
CREATE TABLE IF NOT EXISTS public.contacts (
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

CREATE TABLE IF NOT EXISTS public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  notes TEXT,
  interaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. CALENDAR & IN-APP REMINDERS (PRESERVED IN V1)
CREATE TABLE IF NOT EXISTS public.events (
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

CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. AI DECISION SUPPORT & DETERMINISTIC EVALUATIONS
CREATE TABLE IF NOT EXISTS public.decisions (
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

CREATE TABLE IF NOT EXISTS public.decision_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.decision_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight NUMERIC(3,2) NOT NULL CHECK (weight BETWEEN 0 AND 1),
  constraint_rule TEXT
);

CREATE TABLE IF NOT EXISTS public.decision_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  ai_provider TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  deterministic_scores JSONB NOT NULL,
  ranking JSONB NOT NULL,
  ai_reasoning TEXT NOT NULL,
  pros_cons JSONB NOT NULL,
  trade_off_analysis TEXT,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. NOTIFICATIONS & ADMIN
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- SECURITY DEFINER HELPER: NON-RECURSIVE ADMIN CHECK (Fixes Issue 2)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ==============================================================================
-- PRIVILEGE ESCALATION PROTECTION (Fixes Issue 1)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent non-admins from changing role or active status
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Privilege escalation rejected: Only administrators can modify roles or account activation status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- ==============================================================================
-- CROSS-RECORD OWNERSHIP CONSISTENCY TRIGGERS (Fixes Issue 3)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.verify_record_ownership_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Tasks: if goal_id is supplied, verify goal belongs to same user
  IF TG_TABLE_NAME = 'tasks' AND NEW.goal_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.goals WHERE id = NEW.goal_id AND user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'Ownership violation: Associated goal does not belong to the task owner.';
    END IF;
  END IF;

  -- 2. Habit Logs: verify habit belongs to same user
  IF TG_TABLE_NAME = 'habit_logs' THEN
    IF NOT EXISTS (SELECT 1 FROM public.habits WHERE id = NEW.habit_id AND user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'Ownership violation: Associated habit does not belong to the user.';
    END IF;
  END IF;

  -- 3. Interactions: verify contact belongs to same user
  IF TG_TABLE_NAME = 'interactions' THEN
    IF NOT EXISTS (SELECT 1 FROM public.contacts WHERE id = NEW.contact_id AND user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'Ownership violation: Associated contact does not belong to the user.';
    END IF;
  END IF;

  -- 4. Career Items: if goal_id is supplied, verify goal belongs to same user
  IF TG_TABLE_NAME = 'career_items' AND NEW.goal_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.goals WHERE id = NEW.goal_id AND user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'Ownership violation: Associated goal does not belong to the user.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_ownership_check ON public.tasks;
CREATE TRIGGER trg_tasks_ownership_check
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.verify_record_ownership_consistency();

DROP TRIGGER IF EXISTS trg_habit_logs_ownership_check ON public.habit_logs;
CREATE TRIGGER trg_habit_logs_ownership_check
  BEFORE INSERT OR UPDATE ON public.habit_logs
  FOR EACH ROW EXECUTE FUNCTION public.verify_record_ownership_consistency();

DROP TRIGGER IF EXISTS trg_interactions_ownership_check ON public.interactions;
CREATE TRIGGER trg_interactions_ownership_check
  BEFORE INSERT OR UPDATE ON public.interactions
  FOR EACH ROW EXECUTE FUNCTION public.verify_record_ownership_consistency();

DROP TRIGGER IF EXISTS trg_career_items_ownership_check ON public.career_items;
CREATE TRIGGER trg_career_items_ownership_check
  BEFORE INSERT OR UPDATE ON public.career_items
  FOR EACH ROW EXECUTE FUNCTION public.verify_record_ownership_consistency();

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, is_active, privacy_settings)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'avatar_url',
    'user',
    true,
    '{"share_goals": false, "share_finance": false, "share_health": false, "share_career": false}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- ROW-LEVEL SECURITY POLICIES (STRICT USER ISOLATION & NON-RECURSIVE)
-- ==============================================================================
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

-- 1. Profiles: Non-recursive policies
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins view all profiles metadata" ON public.profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins manage all profiles" ON public.profiles
  FOR ALL USING (public.is_admin());

-- 2. User Life-Area Tables: STRICT USER-ONLY ACCESS (No admin snooping)
-- Enforces cross-record consistency directly in RLS WITH CHECK clauses (Fixes Issue 3)
CREATE POLICY "Users own goals" ON public.goals
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own tasks" ON public.tasks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    (goal_id IS NULL OR EXISTS (SELECT 1 FROM public.goals WHERE id = goal_id AND user_id = auth.uid()))
  );

CREATE POLICY "Users own habits" ON public.habits
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own habit_logs" ON public.habit_logs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid())
  );

CREATE POLICY "Users own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own budgets" ON public.budgets
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own health_activities" ON public.health_activities
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own career_items" ON public.career_items
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    (goal_id IS NULL OR EXISTS (SELECT 1 FROM public.goals WHERE id = goal_id AND user_id = auth.uid()))
  );

CREATE POLICY "Users own contacts" ON public.contacts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own interactions" ON public.interactions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.contacts WHERE id = contact_id AND user_id = auth.uid())
  );

CREATE POLICY "Users own events" ON public.events
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own reminders" ON public.reminders
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own decisions" ON public.decisions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own decision_alternatives" ON public.decision_alternatives
  FOR ALL USING (EXISTS (SELECT 1 FROM public.decisions WHERE id = decision_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.decisions WHERE id = decision_id AND user_id = auth.uid()));

CREATE POLICY "Users own decision_criteria" ON public.decision_criteria
  FOR ALL USING (EXISTS (SELECT 1 FROM public.decisions WHERE id = decision_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.decisions WHERE id = decision_id AND user_id = auth.uid()));

CREATE POLICY "Users own decision_evaluations" ON public.decision_evaluations
  FOR ALL USING (EXISTS (SELECT 1 FROM public.decisions WHERE id = decision_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.decisions WHERE id = decision_id AND user_id = auth.uid()));

CREATE POLICY "Users own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. System Settings & Audit Logs (Admin)
CREATE POLICY "Authenticated read settings" ON public.system_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage settings" ON public.system_settings
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins read audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(user_id, due_date) WHERE status != 'done';
CREATE INDEX IF NOT EXISTS idx_habits_user_active ON public.habits(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON public.habit_logs(habit_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_time ON public.events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON public.reminders(user_id, remind_at) WHERE is_sent = false;
CREATE INDEX IF NOT EXISTS idx_decisions_user ON public.decisions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON public.audit_logs(created_at DESC);
