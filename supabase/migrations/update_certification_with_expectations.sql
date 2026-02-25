-- Add expectations completion status to certifications
ALTER TABLE public.marriage_course_certifications
ADD COLUMN IF NOT EXISTS expectations_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS expectations_completed_at TIMESTAMPTZ;

-- Update certification function to require expectations
CREATE OR REPLACE FUNCTION public.update_marriage_course_certification()
RETURNS TRIGGER AS $$
DECLARE
  total_modules INTEGER;
  completed_modules INTEGER;
  all_modules_completed BOOLEAN;
  expectations_complete BOOLEAN;
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
  all_modules_completed := (completed_modules >= total_modules AND total_modules > 0);
  
  -- Check if expectations are completed
  SELECT COALESCE(is_complete, false) INTO expectations_complete
  FROM public.marriage_expectations_obligations
  WHERE user_id = NEW.user_id;
  
  -- Certification requires both: all modules + expectations
  all_completed := all_modules_completed AND expectations_complete;
  
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
    total_modules_count,
    expectations_completed,
    expectations_completed_at
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
    total_modules,
    expectations_complete,
    CASE 
      WHEN expectations_complete AND NOT EXISTS (
        SELECT 1 FROM public.marriage_course_certifications 
        WHERE user_id = NEW.user_id AND expectations_completed = true
      ) THEN now()
      ELSE NULL
    END
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
    expectations_completed = expectations_complete,
    expectations_completed_at = CASE 
      WHEN expectations_complete AND marriage_course_certifications.expectations_completed_at IS NULL THEN now()
      ELSE marriage_course_certifications.expectations_completed_at
    END,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also trigger on expectations table updates
CREATE TRIGGER update_certification_on_expectations_change
AFTER INSERT OR UPDATE ON public.marriage_expectations_obligations
FOR EACH ROW
EXECUTE FUNCTION public.update_marriage_course_certification();


