-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- analyses
CREATE TABLE public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  analysis_ref TEXT NOT NULL,
  file_name TEXT NOT NULL,
  size_kb INTEGER NOT NULL DEFAULT 0,
  duration_sec NUMERIC NOT NULL DEFAULT 0,
  sample_rate INTEGER NOT NULL DEFAULT 16000,
  model TEXT NOT NULL DEFAULT 'simulated',
  source TEXT NOT NULL DEFAULT 'simulated' CHECK (source IN ('simulated','external')),
  verdict TEXT NOT NULL CHECK (verdict IN ('authentic','suspicious','deepfake')),
  confidence NUMERIC NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  audio_path TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX analyses_user_created_idx ON public.analyses (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyses TO authenticated;
GRANT ALL ON public.analyses TO service_role;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analyses_own" ON public.analyses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- training samples
CREATE TABLE public.training_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  label TEXT NOT NULL CHECK (label IN ('real','fake')),
  storage_path TEXT NOT NULL,
  size_kb INTEGER NOT NULL DEFAULT 0,
  duration_sec NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX training_samples_user_idx ON public.training_samples (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_samples TO authenticated;
GRANT ALL ON public.training_samples TO service_role;
ALTER TABLE public.training_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_samples_own" ON public.training_samples FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- training runs
CREATE TABLE public.training_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  epochs INTEGER NOT NULL DEFAULT 10,
  dataset_size INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC,
  val_accuracy NUMERIC,
  loss NUMERIC,
  external_job_id TEXT,
  endpoint_url TEXT,
  message TEXT,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX training_runs_user_idx ON public.training_runs (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_runs TO authenticated;
GRANT ALL ON public.training_runs TO service_role;
ALTER TABLE public.training_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_runs_own" ON public.training_runs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- model settings
CREATE TABLE public.model_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  inference_url TEXT,
  training_url TEXT,
  model_name TEXT NOT NULL DEFAULT 'AgenticXAI-Voice v2.4 (ensemble)',
  threshold_fake NUMERIC NOT NULL DEFAULT 0.62,
  threshold_review NUMERIC NOT NULL DEFAULT 0.42,
  retention_days INTEGER NOT NULL DEFAULT 90,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_settings TO authenticated;
GRANT ALL ON public.model_settings TO service_role;
ALTER TABLE public.model_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "model_settings_own" ON public.model_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER analyses_updated_at BEFORE UPDATE ON public.analyses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER training_samples_updated_at BEFORE UPDATE ON public.training_samples FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER training_runs_updated_at BEFORE UPDATE ON public.training_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER model_settings_updated_at BEFORE UPDATE ON public.model_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- storage policies (buckets created separately)
CREATE POLICY "audio_samples_own_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'audio-samples' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "audio_samples_own_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audio-samples' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "audio_samples_own_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'audio-samples' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "audio_samples_own_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'audio-samples' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "training_audio_own_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'training-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "training_audio_own_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'training-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "training_audio_own_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'training-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "training_audio_own_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'training-audio' AND auth.uid()::text = (storage.foldername(name))[1]);