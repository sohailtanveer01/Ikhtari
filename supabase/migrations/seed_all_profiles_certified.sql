-- ============================================================
-- SEED: Certify all existing profiles with varied expectations
-- so compatibility scores appear in the app during development.
-- ============================================================

-- Step 1: Add dress_code_expectations column if it doesn't exist yet
ALTER TABLE public.marriage_expectations_obligations
ADD COLUMN IF NOT EXISTS dress_code_expectations JSONB;

-- ============================================================
-- Step 2: Mark every module completed for every existing user
-- ============================================================
INSERT INTO public.marriage_course_user_progress (
  user_id, module_id,
  module_completed, module_completed_at,
  video_watched, video_watched_at,
  quiz_passed, quiz_passed_at, quiz_score
)
SELECT
  u.id                                                      AS user_id,
  m.id                                                      AS module_id,
  true                                                      AS module_completed,
  now() - (random() * interval '30 days')                  AS module_completed_at,
  true                                                      AS video_watched,
  now() - (random() * interval '32 days')                  AS video_watched_at,
  true                                                      AS quiz_passed,
  now() - (random() * interval '31 days')                  AS quiz_passed_at,
  (floor(random() * 20) + 80)::int                         AS quiz_score  -- 80–100
FROM public.users u
CROSS JOIN public.marriage_course_modules m
WHERE m.is_active = true
ON CONFLICT (user_id, module_id) DO UPDATE SET
  module_completed     = true,
  module_completed_at  = COALESCE(marriage_course_user_progress.module_completed_at, now()),
  video_watched        = true,
  quiz_passed          = true;

-- ============================================================
-- Step 3: Insert varied expectations for all users.
--         3 rotating profiles keep compatibility scores diverse.
-- ============================================================
INSERT INTO public.marriage_expectations_obligations (
  user_id,
  financial_expectations,
  lifestyle_expectations,
  mahr_expectations,
  religious_expectations,
  dress_code_expectations,
  husband_obligations,
  wife_obligations,
  additional_notes,
  is_complete,
  completed_at
)
SELECT
  u.id,

  -- FINANCIAL
  CASE (ROW_NUMBER() OVER (ORDER BY u.id) % 3)
    WHEN 0 THEN '{
      "primary_provider":       "husband",
      "expected_income_range":  "high",
      "financial_transparency": "true",
      "savings_expectations":   "high",
      "wife_working":           "no"
    }'::jsonb
    WHEN 1 THEN '{
      "primary_provider":       "shared",
      "expected_income_range":  "medium",
      "financial_transparency": "true",
      "savings_expectations":   "medium",
      "wife_working":           "yes"
    }'::jsonb
    ELSE '{
      "primary_provider":       "husband",
      "expected_income_range":  "medium",
      "financial_transparency": "true",
      "savings_expectations":   "medium",
      "wife_working":           "part_time"
    }'::jsonb
  END,

  -- LIFESTYLE
  CASE (ROW_NUMBER() OVER (ORDER BY u.id) % 3)
    WHEN 0 THEN '{
      "living_arrangement": "separate",
      "work_life_balance":  "traditional",
      "social_activities":  "conservative",
      "technology_usage":   "limited",
      "travel_expectations":"occasional"
    }'::jsonb
    WHEN 1 THEN '{
      "living_arrangement": "separate",
      "work_life_balance":  "modern",
      "social_activities":  "active",
      "technology_usage":   "moderate",
      "travel_expectations":"frequent"
    }'::jsonb
    ELSE '{
      "living_arrangement": "flexible",
      "work_life_balance":  "flexible",
      "social_activities":  "moderate",
      "technology_usage":   "moderate",
      "travel_expectations":"occasional"
    }'::jsonb
  END,

  -- MAHR
  CASE (ROW_NUMBER() OVER (ORDER BY u.id) % 3)
    WHEN 0 THEN '{
      "mahr_type":       "cash",
      "mahr_range":      "moderate",
      "payment_timeline":"immediate",
      "flexibility":     "strict"
    }'::jsonb
    WHEN 1 THEN '{
      "mahr_type":       "flexible",
      "mahr_range":      "flexible",
      "payment_timeline":"flexible",
      "flexibility":     "very_flexible"
    }'::jsonb
    ELSE '{
      "mahr_type":       "cash",
      "mahr_range":      "modest",
      "payment_timeline":"immediate",
      "flexibility":     "moderate"
    }'::jsonb
  END,

  -- RELIGIOUS
  CASE (ROW_NUMBER() OVER (ORDER BY u.id) % 3)
    WHEN 0 THEN '{
      "prayer_together":               "always",
      "religious_education_children":  "essential",
      "religious_activities":          "very_active",
      "madhhab_compatibility":         "important"
    }'::jsonb
    WHEN 1 THEN '{
      "prayer_together":               "often",
      "religious_education_children":  "important",
      "religious_activities":          "active",
      "madhhab_compatibility":         "flexible"
    }'::jsonb
    ELSE '{
      "prayer_together":               "sometimes",
      "religious_education_children":  "important",
      "religious_activities":          "moderate",
      "madhhab_compatibility":         "preferred"
    }'::jsonb
  END,

  -- DRESS CODE
  CASE (ROW_NUMBER() OVER (ORDER BY u.id) % 3)
    WHEN 0 THEN '{
      "hijab_level":            "abaya_hijab",
      "abaya_outside":          "always",
      "dress_code_flexibility": "firm",
      "mixed_gatherings":       "abaya_hijab"
    }'::jsonb
    WHEN 1 THEN '{
      "hijab_level":            "hijab",
      "abaya_outside":          "flexible",
      "dress_code_flexibility": "her_choice",
      "mixed_gatherings":       "modest_hijab"
    }'::jsonb
    ELSE '{
      "hijab_level":            "niqab",
      "abaya_outside":          "always",
      "dress_code_flexibility": "firm",
      "mixed_gatherings":       "niqab"
    }'::jsonb
  END,

  -- HUSBAND OBLIGATIONS (all true for everyone)
  '{
    "provision":              true,
    "protection":             true,
    "emotional_support":      true,
    "fair_treatment":         true,
    "kindness":               true,
    "consultation":           true,
    "financial_responsibility":true,
    "religious_leadership":   true
  }'::jsonb,

  -- WIFE OBLIGATIONS (all true for everyone)
  '{
    "cooperation":          true,
    "respect":              true,
    "trust":                true,
    "emotional_stability":  true,
    "household_management": true,
    "support_husband":      true,
    "privacy":              true,
    "religious_observance": true
  }'::jsonb,

  '' AS additional_notes,
  true AS is_complete,
  now() - (random() * interval '20 days') AS completed_at

FROM public.users u
ON CONFLICT (user_id) DO UPDATE SET
  financial_expectations   = EXCLUDED.financial_expectations,
  lifestyle_expectations   = EXCLUDED.lifestyle_expectations,
  mahr_expectations        = EXCLUDED.mahr_expectations,
  religious_expectations   = EXCLUDED.religious_expectations,
  dress_code_expectations  = EXCLUDED.dress_code_expectations,
  husband_obligations      = EXCLUDED.husband_obligations,
  wife_obligations         = EXCLUDED.wife_obligations,
  is_complete              = true,
  completed_at             = COALESCE(marriage_expectations_obligations.completed_at, now());

-- ============================================================
-- Step 4: Certify all users directly (don't wait for trigger)
-- ============================================================
INSERT INTO public.marriage_course_certifications (
  user_id, is_certified, certified_at, show_badge,
  completion_percentage, modules_completed_count, total_modules_count
)
SELECT
  u.id,
  true,
  now() - (random() * interval '25 days'),
  true,
  100,
  7,
  7
FROM public.users u
ON CONFLICT (user_id) DO UPDATE SET
  is_certified             = true,
  certified_at             = COALESCE(marriage_course_certifications.certified_at, now()),
  show_badge               = true,
  completion_percentage    = 100,
  modules_completed_count  = 7,
  total_modules_count      = 7;
