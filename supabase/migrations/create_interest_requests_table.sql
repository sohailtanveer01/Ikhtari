CREATE TABLE public.interest_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'answered_back')),
  sender_answered_back BOOLEAN DEFAULT false,
  match_id UUID REFERENCES public.matches(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(sender_id, recipient_id),
  CONSTRAINT no_self_interest CHECK (sender_id != recipient_id)
);

CREATE INDEX idx_interest_requests_sender ON public.interest_requests(sender_id);
CREATE INDEX idx_interest_requests_recipient ON public.interest_requests(recipient_id);
CREATE INDEX idx_interest_requests_status ON public.interest_requests(status);

ALTER TABLE public.interest_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "see_own_sent" ON public.interest_requests FOR SELECT USING (auth.uid() = sender_id);
CREATE POLICY "see_received" ON public.interest_requests FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "create_own" ON public.interest_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "update_as_participant" ON public.interest_requests FOR UPDATE
  USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

-- Enable realtime for badge updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.interest_requests;
