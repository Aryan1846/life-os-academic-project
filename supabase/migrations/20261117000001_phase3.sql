-- Phase 3 additions. The initial migration is already applied and remains untouched.
ALTER TABLE public.health_activities ADD COLUMN IF NOT EXISTS sleep_hours NUMERIC(4,2);
ALTER TABLE public.health_activities ADD COLUMN IF NOT EXISTS metric_value NUMERIC(10,2);
ALTER TABLE public.health_activities ADD COLUMN IF NOT EXISTS metric_unit TEXT;
ALTER TABLE public.health_activities ADD CONSTRAINT health_sleep_range CHECK (sleep_hours IS NULL OR sleep_hours BETWEEN 0 AND 24);

ALTER TABLE public.career_items DROP CONSTRAINT IF EXISTS career_items_type_check;
ALTER TABLE public.career_items ADD CONSTRAINT career_items_type_check CHECK (type IN ('skill', 'certification', 'milestone', 'course', 'project', 'idea', 'application'));

-- Claim due reminders as the signed-in user. An UPDATE lock prevents duplicate delivery.
CREATE OR REPLACE FUNCTION public.deliver_due_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE claimed integer;
BEGIN
  WITH due AS (
    SELECT id, user_id, title, entity_type, entity_id
    FROM public.reminders
    WHERE user_id = auth.uid() AND is_sent = false AND remind_at <= now()
    FOR UPDATE SKIP LOCKED
  ), marked AS (
    UPDATE public.reminders r SET is_sent = true
    FROM due WHERE r.id = due.id
    RETURNING due.user_id, due.title, due.entity_type, due.entity_id
  )
  INSERT INTO public.notifications(user_id, type, title, message, entity_type, entity_id)
  SELECT user_id, 'reminder', title, 'Scheduled reminder', entity_type, entity_id FROM marked;
  GET DIAGNOSTICS claimed = ROW_COUNT;
  RETURN claimed;
END $$;
REVOKE ALL ON FUNCTION public.deliver_due_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deliver_due_reminders() TO authenticated;

CREATE INDEX IF NOT EXISTS idx_transactions_month ON public.transactions(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_health_activity_date ON public.health_activities(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_career_target_date ON public.career_items(user_id, target_date);
CREATE INDEX IF NOT EXISTS idx_events_start ON public.events(user_id, start_time);
CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_alert_once_per_month ON public.notifications(user_id, entity_id, message) WHERE type = 'budget_alert';
