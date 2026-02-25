ALTER TABLE public.users ADD COLUMN IF NOT EXISTS intent_questions_set BOOLEAN DEFAULT false;
