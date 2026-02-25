CREATE TABLE event_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','cancelled','refunded')),
  stripe_payment_intent_id TEXT,
  amount_paid DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  ticket_code TEXT UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 8)),
  purchased_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_user_read"   ON event_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tickets_user_insert" ON event_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tickets_user_update" ON event_tickets FOR UPDATE USING (auth.uid() = user_id);
