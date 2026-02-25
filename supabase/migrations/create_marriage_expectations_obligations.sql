-- Store user expectations and obligations after course completion
CREATE TABLE IF NOT EXISTS public.marriage_expectations_obligations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Financial Expectations
  financial_expectations JSONB, -- {
    -- "primary_provider": "husband" | "shared" | "flexible",
    -- "expected_income_range": "low" | "medium" | "high" | "flexible",
    -- "financial_transparency": true | false,
    -- "savings_expectations": "high" | "medium" | "low" | "none"
  -- }
  
  -- Lifestyle Expectations
  lifestyle_expectations JSONB, -- {
    -- "living_arrangement": "separate" | "with_family" | "flexible",
    -- "work_life_balance": "traditional" | "modern" | "flexible",
    -- "social_activities": "conservative" | "moderate" | "active",
    -- "technology_usage": "limited" | "moderate" | "active",
    -- "travel_expectations": "frequent" | "occasional" | "rare" | "none"
  -- }
  
  -- Mahr Expectations
  mahr_expectations JSONB, -- {
    -- "mahr_type": "cash" | "property" | "education" | "flexible" | "symbolic",
    -- "mahr_range": "symbolic" | "modest" | "moderate" | "substantial" | "flexible",
    -- "payment_timeline": "immediate" | "deferred" | "flexible",
    -- "flexibility": "strict" | "moderate" | "very_flexible"
  -- }
  
  -- Family Expectations
  family_expectations JSONB, -- {
    -- "family_involvement": "high" | "moderate" | "low" | "none",
    -- "living_with_inlaws": "yes" | "no" | "temporary" | "flexible",
    -- "family_visits": "frequent" | "moderate" | "occasional" | "rare",
    -- "cultural_priorities": "islamic_first" | "balanced" | "cultural_first"
  -- }
  
  -- Religious Expectations
  religious_expectations JSONB, -- {
    -- "prayer_together": "always" | "often" | "sometimes" | "prefer_not",
    -- "religious_education_children": "essential" | "important" | "preferred",
    -- "religious_activities": "very_active" | "active" | "moderate" | "minimal",
    -- "madhhab_compatibility": "essential" | "important" | "preferred" | "flexible"
  -- }
  
  -- Obligations User Commits To (as Husband)
  husband_obligations JSONB, -- {
    -- "provision": true | false,
    -- "protection": true | false,
    -- "emotional_support": true | false,
    -- "fair_treatment": true | false,
    -- "kindness": true | false,
    -- "consultation": true | false,
    -- "financial_responsibility": true | false,
    -- "religious_leadership": true | false
  -- }
  
  -- Obligations User Commits To (as Wife)
  wife_obligations JSONB, -- {
    -- "cooperation": true | false,
    -- "respect": true | false,
    -- "trust": true | false,
    -- "emotional_stability": true | false,
    -- "household_management": true | false,
    -- "support_husband": true | false,
    -- "privacy": true | false,
    -- "religious_observance": true | false
  -- }
  
  -- Additional Notes
  additional_notes TEXT, -- Free text for any additional expectations or clarifications
  
  -- Status
  is_complete BOOLEAN DEFAULT false, -- True when all sections filled
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_expectations_user ON public.marriage_expectations_obligations(user_id);
CREATE INDEX idx_expectations_complete ON public.marriage_expectations_obligations(is_complete);

-- Enable RLS
ALTER TABLE public.marriage_expectations_obligations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own expectations"
ON public.marriage_expectations_obligations
FOR SELECT
USING (auth.uid() = user_id);

-- Allow viewing expectations for compatibility matching (but not full details)
CREATE POLICY "Certified users can view others' expectations for matching"
ON public.marriage_expectations_obligations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.marriage_course_certifications
    WHERE user_id = auth.uid() AND is_certified = true
  )
  AND EXISTS (
    SELECT 1 FROM public.marriage_course_certifications
    WHERE user_id = marriage_expectations_obligations.user_id AND is_certified = true
  )
);

CREATE POLICY "Users can insert their own expectations"
ON public.marriage_expectations_obligations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expectations"
ON public.marriage_expectations_obligations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marriage_expectations_obligations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marriage_expectations_obligations_updated_at
BEFORE UPDATE ON public.marriage_expectations_obligations
FOR EACH ROW
EXECUTE FUNCTION update_marriage_expectations_obligations_updated_at();


