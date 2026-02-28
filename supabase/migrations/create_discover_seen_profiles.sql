CREATE TABLE IF NOT EXISTS discover_seen_profiles (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_discover_seen_profiles_user
  ON discover_seen_profiles(user_id);

-- Enable RLS
ALTER TABLE discover_seen_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own seen profiles
CREATE POLICY "users_read_own_seen_profiles" ON discover_seen_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own seen profiles
CREATE POLICY "users_insert_own_seen_profiles" ON discover_seen_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own seen profiles
CREATE POLICY "users_delete_own_seen_profiles" ON discover_seen_profiles
  FOR DELETE USING (auth.uid() = user_id);
