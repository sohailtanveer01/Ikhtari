-- Create marriage course quiz questions table
CREATE TABLE IF NOT EXISTS public.marriage_course_quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES public.marriage_course_modules(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice', -- 'multiple_choice' or 'scenario'
  options JSONB NOT NULL, -- Array of {id, text, is_correct: boolean}
  explanation TEXT, -- Shown after submission
  display_order INTEGER NOT NULL, -- Order within module
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_quiz_questions_module ON public.marriage_course_quiz_questions(module_id);
CREATE INDEX idx_quiz_questions_order ON public.marriage_course_quiz_questions(module_id, display_order);

-- Enable RLS
ALTER TABLE public.marriage_course_quiz_questions ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone can read quiz questions
CREATE POLICY "Anyone can view quiz questions"
ON public.marriage_course_quiz_questions
FOR SELECT
USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marriage_course_quiz_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marriage_course_quiz_questions_updated_at
BEFORE UPDATE ON public.marriage_course_quiz_questions
FOR EACH ROW
EXECUTE FUNCTION update_marriage_course_quiz_questions_updated_at();


