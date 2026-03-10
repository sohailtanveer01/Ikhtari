-- Add wali_name and relationship fields to chaperone_links
-- wali_name: the name the ward enters when inviting their wali
-- relationship: Father | Brother | Uncle | Guardian | Imam | Other
ALTER TABLE chaperone_links
  ADD COLUMN IF NOT EXISTS wali_name TEXT,
  ADD COLUMN IF NOT EXISTS relationship TEXT;
