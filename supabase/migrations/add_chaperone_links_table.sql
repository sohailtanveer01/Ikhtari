CREATE TABLE chaperone_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,   -- ward
  chaperone_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Wali (nullable until accepted)
  invite_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(user_id, invite_email)
);

ALTER TABLE chaperone_links ENABLE ROW LEVEL SECURITY;

-- Ward can read their own links
CREATE POLICY "ward_read" ON chaperone_links FOR SELECT USING (auth.uid() = user_id);
-- Chaperone can read links where they are the chaperone
CREATE POLICY "chaperone_read" ON chaperone_links FOR SELECT USING (auth.uid() = chaperone_id);
-- Ward can create invites
CREATE POLICY "ward_insert" ON chaperone_links FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Ward can revoke (update status)
CREATE POLICY "ward_update" ON chaperone_links FOR UPDATE USING (auth.uid() = user_id);
-- Chaperone can accept (update chaperone_id + status)
CREATE POLICY "chaperone_update" ON chaperone_links FOR UPDATE USING (auth.uid() = chaperone_id);
