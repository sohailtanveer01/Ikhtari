-- Create marriage course certifications table
CREATE TABLE IF NOT EXISTS public.marriage_course_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Certification status
  is_certified BOOLEAN DEFAULT false,
  certified_at TIMESTAMPTZ,
  
  -- Badge display preference
  show_badge BOOLEAN DEFAULT true, -- User can toggle badge visibility
  
  -- Metadata
  completion_percentage INTEGER DEFAULT 0, -- Overall course completion
  modules_completed_count INTEGER DEFAULT 0,
  total_modules_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_certifications_user ON public.marriage_course_certifications(user_id);
CREATE INDEX idx_certifications_certified ON public.marriage_course_certifications(is_certified, show_badge);

-- Enable RLS
ALTER TABLE public.marriage_course_certifications ENABLE ROW LEVEL SECURITY;

-- RLS: Users can see their own certification, others can see if certified (for badge display)
CREATE POLICY "Users can view their own certification"
ON public.marriage_course_certifications
FOR SELECT
USING (auth.uid() = user_id);

-- Allow viewing certified status for badge display (but not full details)
CREATE POLICY "Anyone can view certified status for badges"
ON public.marriage_course_certifications
FOR SELECT
USING (is_certified = true AND show_badge = true);

CREATE POLICY "Users can insert their own certification"
ON public.marriage_course_certifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own certification"
ON public.marriage_course_certifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marriage_course_certifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marriage_course_certifications_updated_at
BEFORE UPDATE ON public.marriage_course_certifications
FOR EACH ROW
EXECUTE FUNCTION update_marriage_course_certifications_updated_at();


