-- Phase 5: keep editable inputs and immutable evaluation versions without rewriting older migrations.
ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS evaluation_started_at TIMESTAMPTZ;
ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE public.decision_evaluations ADD COLUMN IF NOT EXISTS input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.decision_evaluations ADD COLUMN IF NOT EXISTS context_snapshot JSONB;
ALTER TABLE public.decision_evaluations ADD COLUMN IF NOT EXISTS analysis JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.decision_evaluations ADD COLUMN IF NOT EXISTS sensitivity JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.decision_evaluations ADD COLUMN IF NOT EXISTS excluded JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.decision_evaluations ADD COLUMN IF NOT EXISTS penalties JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.decision_evaluations ADD COLUMN IF NOT EXISTS normalized_weights JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.decision_evaluations ADD COLUMN IF NOT EXISTS final_choice TEXT;
ALTER TABLE public.decision_evaluations ADD COLUMN IF NOT EXISTS outcome_notes TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_decision_evaluation_version ON public.decision_evaluations(decision_id, version);
CREATE INDEX IF NOT EXISTS idx_decisions_user_updated ON public.decisions(user_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_decision_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NOT (
    (OLD.status = 'draft' AND NEW.status = 'criteria_defined') OR
    (OLD.status = 'criteria_defined' AND NEW.status IN ('context_attached', 'draft')) OR
    (OLD.status = 'context_attached' AND NEW.status IN ('evaluating', 'draft')) OR
    (OLD.status = 'evaluating' AND NEW.status IN ('evaluated', 'context_attached')) OR
    (OLD.status = 'evaluated' AND NEW.status IN ('closed', 'draft')) OR
    (OLD.status = 'closed' AND NEW.status = 'draft') OR
    (OLD.status = 'awaiting_input' AND NEW.status = 'draft')
  ) THEN RAISE EXCEPTION 'Invalid decision status transition'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_decision_transition BEFORE UPDATE OF status ON public.decisions
FOR EACH ROW EXECUTE FUNCTION public.enforce_decision_transition();

-- Keep the architecture's normalized current alternatives and criteria in sync with
-- the editable JSON input. Evaluation rows retain immutable snapshots for history.
CREATE OR REPLACE FUNCTION public.sync_decision_inputs()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE total_weight numeric;
BEGIN
  DELETE FROM public.decision_alternatives WHERE decision_id = NEW.id;
  DELETE FROM public.decision_criteria WHERE decision_id = NEW.id;
  INSERT INTO public.decision_alternatives(id, decision_id, title, description, sort_order)
  SELECT (entry.value->>'id')::uuid, NEW.id, entry.value->>'title', entry.value->>'description', entry.ordinality - 1
  FROM jsonb_array_elements(COALESCE(NEW.input_snapshot->'alternatives', '[]'::jsonb)) WITH ORDINALITY AS entry(value, ordinality);
  SELECT COALESCE(SUM((entry.value->>'weight')::numeric), 0) INTO total_weight
  FROM jsonb_array_elements(COALESCE(NEW.input_snapshot->'criteria', '[]'::jsonb)) AS entry(value);
  IF total_weight > 0 THEN
    INSERT INTO public.decision_criteria(id, decision_id, name, weight, constraint_rule)
    SELECT (entry.value->>'id')::uuid, NEW.id, entry.value->>'name',
      ROUND((entry.value->>'weight')::numeric / total_weight, 2),
      CASE WHEN entry.value->'hardConstraint' IS NOT NULL AND entry.value->'hardConstraint' <> 'null'::jsonb
        THEN (entry.value->'hardConstraint')::text ELSE NULL END
    FROM jsonb_array_elements(COALESCE(NEW.input_snapshot->'criteria', '[]'::jsonb)) AS entry(value);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_sync_decision_inputs AFTER INSERT OR UPDATE OF input_snapshot ON public.decisions
FOR EACH ROW EXECUTE FUNCTION public.sync_decision_inputs();

-- Atomic per-user cap for external evaluation calls. Mock evaluations are free of this quota.
CREATE TABLE IF NOT EXISTS public.decision_ai_quota (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0
);
ALTER TABLE public.decision_ai_quota ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own decision AI quota" ON public.decision_ai_quota FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.claim_decision_ai_quota()
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE allowed boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  INSERT INTO public.decision_ai_quota(user_id, window_start, attempts)
  VALUES (auth.uid(), now(), 1)
  ON CONFLICT (user_id) DO UPDATE SET
    window_start = CASE WHEN public.decision_ai_quota.window_start < now() - interval '1 hour' THEN now() ELSE public.decision_ai_quota.window_start END,
    attempts = CASE WHEN public.decision_ai_quota.window_start < now() - interval '1 hour' THEN 1 ELSE public.decision_ai_quota.attempts + 1 END
  RETURNING attempts <= 10 INTO allowed;
  RETURN allowed;
END $$;
REVOKE ALL ON FUNCTION public.claim_decision_ai_quota() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_decision_ai_quota() TO authenticated;
