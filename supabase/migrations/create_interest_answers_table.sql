CREATE TABLE public.interest_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_request_id UUID NOT NULL REFERENCES public.interest_requests(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.intent_questions(id) ON DELETE CASCADE,
  answerer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(interest_request_id, question_id, answerer_id)
);

CREATE INDEX idx_interest_answers_request ON public.interest_answers(interest_request_id);

ALTER TABLE public.interest_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_read" ON public.interest_answers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.interest_requests ir
    WHERE ir.id = interest_request_id
    AND (ir.sender_id = auth.uid() OR ir.recipient_id = auth.uid())
  )
);
CREATE POLICY "insert_own" ON public.interest_answers FOR INSERT WITH CHECK (auth.uid() = answerer_id);
