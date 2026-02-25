-- Create marriage course user progress table
CREATE TABLE IF NOT EXISTS public.marriage_course_user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES public.marriage_course_modules(id) ON DELETE CASCADE NOT NULL,
  
  -- Video progress
  video_watched BOOLEAN DEFAULT false,
  video_watched_at TIMESTAMPTZ,
  video_progress_percent INTEGER DEFAULT 0, -- 0-100, optional for partial watching
  
  -- Quiz progress
  quiz_attempts INTEGER DEFAULT 0,
  quiz_passed BOOLEAN DEFAULT false,
  quiz_passed_at TIMESTAMPTZ,
  quiz_score INTEGER, -- Percentage score (0-100)
  last_quiz_answers JSONB, -- Store last attempt answers for review
  
  -- Module completion
  module_completed BOOLEAN DEFAULT false,
  module_completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  UNIQUE(user_id, module_id)
);

CREATE INDEX idx_course_progress_user ON public.marriage_course_user_progress(user_id);
CREATE INDEX idx_course_progress_module ON public.marriage_course_user_progress(module_id);
CREATE INDEX idx_course_progress_completed ON public.marriage_course_user_progress(user_id, module_completed);

-- Enable RLS
ALTER TABLE public.marriage_course_user_progress ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own progress
CREATE POLICY "Users can view their own progress"
ON public.marriage_course_user_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
ON public.marriage_course_user_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.marriage_course_user_progress
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marriage_course_user_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marriage_course_user_progress_updated_at
BEFORE UPDATE ON public.marriage_course_user_progress
FOR EACH ROW
EXECUTE FUNCTION update_marriage_course_user_progress_updated_at();


