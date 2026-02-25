-- Function to update certification status when progress changes
CREATE OR REPLACE FUNCTION public.update_marriage_course_certification()
RETURNS TRIGGER AS $$
DECLARE
  total_modules INTEGER;
  completed_modules INTEGER;
  all_completed BOOLEAN;
  completion_pct INTEGER;
BEGIN
  -- Get total active modules
  SELECT COUNT(*) INTO total_modules
  FROM public.marriage_course_modules
  WHERE is_active = true;
  
  -- Get completed modules for this user
  SELECT COUNT(*) INTO completed_modules
  FROM public.marriage_course_user_progress
  WHERE user_id = NEW.user_id
    AND module_completed = true;
  
  -- Check if all modules are completed
  all_completed := (completed_modules >= total_modules AND total_modules > 0);
  
  -- Calculate completion percentage
  IF total_modules > 0 THEN
    completion_pct := ROUND((completed_modules::NUMERIC / total_modules::NUMERIC) * 100);
  ELSE
    completion_pct := 0;
  END IF;
  
  -- Update or insert certification record
  INSERT INTO public.marriage_course_certifications (
    user_id,
    is_certified,
    certified_at,
    completion_percentage,
    modules_completed_count,
    total_modules_count
  )
  VALUES (
    NEW.user_id,
    all_completed,
    CASE 
      WHEN all_completed AND NOT EXISTS (
        SELECT 1 FROM public.marriage_course_certifications 
        WHERE user_id = NEW.user_id AND is_certified = true
      ) THEN now() 
      ELSE NULL 
    END,
    completion_pct,
    completed_modules,
    total_modules
  )
  ON CONFLICT (user_id) DO UPDATE SET
    is_certified = all_completed,
    certified_at = CASE 
      WHEN all_completed AND marriage_course_certifications.certified_at IS NULL THEN now()
      ELSE marriage_course_certifications.certified_at
    END,
    completion_percentage = completion_pct,
    modules_completed_count = completed_modules,
    total_modules_count = total_modules,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update certification when progress changes
CREATE TRIGGER update_certification_on_progress_change
AFTER INSERT OR UPDATE ON public.marriage_course_user_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_marriage_course_certification();

-- Helper function to check if user is certified (for queries)
CREATE OR REPLACE FUNCTION public.is_user_certified(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_certified AND show_badge 
     FROM public.marriage_course_certifications 
     WHERE user_id = user_uuid),
    false
  );
$$ LANGUAGE sql STABLE;


