-- Create marriage course modules table
CREATE TABLE IF NOT EXISTS public.marriage_course_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_number INTEGER UNIQUE NOT NULL, -- 1, 2, 3, etc. (determines order)
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  video_url TEXT, -- URL to video (stored in Supabase Storage or external)
  video_duration_seconds INTEGER, -- Optional: for progress tracking
  key_takeaways TEXT[], -- Array of bullet points
  is_active BOOLEAN DEFAULT true, -- Allow disabling modules
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_marriage_course_modules_number ON public.marriage_course_modules(module_number);
CREATE INDEX idx_marriage_course_modules_active ON public.marriage_course_modules(is_active);

-- Enable RLS
ALTER TABLE public.marriage_course_modules ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone can read active modules
CREATE POLICY "Anyone can view active course modules"
ON public.marriage_course_modules
FOR SELECT
USING (is_active = true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marriage_course_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marriage_course_modules_updated_at
BEFORE UPDATE ON public.marriage_course_modules
FOR EACH ROW
EXECUTE FUNCTION update_marriage_course_modules_updated_at();


