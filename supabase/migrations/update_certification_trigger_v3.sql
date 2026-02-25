-- Update certification trigger to handle total_modules = 0 edge case
-- and to certify based on module completion + expectations (no quiz required)

CREATE OR REPLACE FUNCTION public.check_and_certify_user()
RETURNS TRIGGER AS $$
DECLARE
  total_modules INTEGER;
  completed_modules INTEGER;
  all_modules_completed BOOLEAN;
  expectations_complete BOOLEAN;
  user_id_val UUID;
BEGIN
  -- Determine user_id from whichever table triggered this
  IF TG_TABLE_NAME = 'marriage_course_user_progress' THEN
    user_id_val := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'marriage_expectations_obligations' THEN
    user_id_val := NEW.user_id;
  ELSE
    RETURN NEW;
  END IF;

  -- Count total active modules
  SELECT COUNT(*) INTO total_modules
  FROM public.marriage_course_modules
  WHERE is_active = true;

  -- Count completed modules for this user
  SELECT COUNT(*) INTO completed_modules
  FROM public.marriage_course_user_progress p
  JOIN public.marriage_course_modules m ON p.module_id = m.id
  WHERE p.user_id = user_id_val
    AND p.module_completed = true
    AND m.is_active = true;

  -- Handle edge case: if no modules exist, treat as done
  IF total_modules = 0 THEN
    all_modules_completed := true;
  ELSE
    all_modules_completed := (completed_modules >= total_modules);
  END IF;

  -- Check if expectations are complete
  SELECT COALESCE(
    (SELECT is_complete FROM public.marriage_expectations_obligations WHERE user_id = user_id_val),
    false
  ) INTO expectations_complete;

  -- If all conditions met, certify the user
  IF all_modules_completed AND expectations_complete THEN
    INSERT INTO public.marriage_course_certifications (user_id, is_certified, certified_at, show_badge)
    VALUES (user_id_val, true, NOW(), true)
    ON CONFLICT (user_id) DO UPDATE SET
      is_certified = true,
      certified_at = COALESCE(public.marriage_course_certifications.certified_at, NOW()),
      show_badge = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist, then recreate
DROP TRIGGER IF EXISTS check_certification_on_progress ON public.marriage_course_user_progress;
DROP TRIGGER IF EXISTS check_certification_on_expectations ON public.marriage_expectations_obligations;

CREATE TRIGGER check_certification_on_progress
  AFTER INSERT OR UPDATE ON public.marriage_course_user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_certify_user();

CREATE TRIGGER check_certification_on_expectations
  AFTER INSERT OR UPDATE ON public.marriage_expectations_obligations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_certify_user();
