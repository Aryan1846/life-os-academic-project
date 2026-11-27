-- Persist a stable source key so polling and concurrent requests cannot duplicate alerts.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_dedupe ON public.notifications(user_id, dedupe_key);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_time ON public.notifications(user_id, is_read, created_at DESC);

-- Presence records support a basic count of signed-in app sessions without reading private life data.
CREATE TABLE IF NOT EXISTS public.session_presence (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.session_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users update own presence" ON public.session_presence FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view presence metadata" ON public.session_presence FOR SELECT USING (public.is_admin());
CREATE INDEX IF NOT EXISTS idx_session_presence_last_seen ON public.session_presence(last_seen DESC);

INSERT INTO public.system_settings(key, value, description) VALUES
  ('registration_enabled', 'true'::jsonb, 'Allow new account registration'),
  ('maintenance_mode', 'false'::jsonb, 'Restrict the application to administrators')
ON CONFLICT (key) DO NOTHING;

-- Record completion transitions explicitly so later edits do not rewrite history in reports.
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.career_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
UPDATE public.goals SET completed_at = updated_at WHERE status = 'completed' AND completed_at IS NULL;
UPDATE public.career_items SET completed_at = updated_at WHERE status = 'completed' AND completed_at IS NULL;
CREATE OR REPLACE FUNCTION public.stamp_completion()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    IF TG_OP = 'INSERT' THEN NEW.completed_at := now();
    ELSIF OLD.status IS DISTINCT FROM 'completed' THEN NEW.completed_at := now();
    END IF;
  ELSE
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_goals_completion BEFORE INSERT OR UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.stamp_completion();
CREATE TRIGGER trg_career_completion BEFORE INSERT OR UPDATE ON public.career_items FOR EACH ROW EXECUTE FUNCTION public.stamp_completion();
CREATE INDEX IF NOT EXISTS idx_goals_completion ON public.goals(user_id, completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_career_completion ON public.career_items(user_id, completed_at) WHERE completed_at IS NOT NULL;
