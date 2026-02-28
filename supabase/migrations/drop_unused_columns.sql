-- Drop unused columns from the users table
-- Tier 1: Completely unreferenced anywhere in the codebase
-- Tier 2: Never written (removed from onboarding + profile edit); display code cleaned up separately

ALTER TABLE public.users
  -- Tier 1: dead columns
  DROP COLUMN IF EXISTS verified,
  DROP COLUMN IF EXISTS onboarding_completed,
  DROP COLUMN IF EXISTS notifications_enabled,
  -- Tier 2: removed from onboarding, never populated for new users
  DROP COLUMN IF EXISTS sect,
  DROP COLUMN IF EXISTS born_muslim,
  DROP COLUMN IF EXISTS religious_practice,
  DROP COLUMN IF EXISTS alcohol_habit,
  DROP COLUMN IF EXISTS smoking_habit,
  DROP COLUMN IF EXISTS hobbies;
