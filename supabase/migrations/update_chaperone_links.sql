-- Add expires_at and last_accessed_at columns to chaperone_links
ALTER TABLE chaperone_links
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;

-- Extend the status CHECK constraint to include 'declined'
ALTER TABLE chaperone_links
  DROP CONSTRAINT IF EXISTS chaperone_links_status_check;

ALTER TABLE chaperone_links
  ADD CONSTRAINT chaperone_links_status_check
  CHECK (status IN ('pending', 'active', 'revoked', 'declined'));
