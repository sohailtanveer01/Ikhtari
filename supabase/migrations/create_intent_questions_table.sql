CREATE TABLE public.intent_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  is_from_library BOOLEAN DEFAULT false,
  library_question_id TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_intent_questions_user_id ON public.intent_questions(user_id);
ALTER TABLE public.intent_questions ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed when viewing a profile to answer questions)
CREATE POLICY "read_intent_questions" ON public.intent_questions FOR SELECT USING (true);
-- Users manage their own
CREATE POLICY "insert_own" ON public.intent_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own" ON public.intent_questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own" ON public.intent_questions FOR DELETE USING (auth.uid() = user_id);
