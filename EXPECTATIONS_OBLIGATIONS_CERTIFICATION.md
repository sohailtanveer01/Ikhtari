# Expectations & Obligations Certification - Implementation Plan

## Overview

Extend the Marriage Foundations Course to include a final step where users set their **expectations** and **obligations** after completing all modules. This creates a comprehensive certification that shows:
1. User has learned Islamic marriage obligations
2. User's expectations (financial, lifestyle, mahr, etc.)
3. User's commitments (obligations they're willing to adhere to)

---

## 🎯 Flow

1. User completes all course modules ✅ (Already implemented)
2. User passes all quizzes ✅ (Already implemented)
3. **NEW:** User sets their expectations
4. **NEW:** User sets their obligations
5. Certification is awarded with expectations/obligations attached
6. Expectations/obligations displayed on profile
7. Used for compatibility matching

---

## 📊 Database Schema

### 1. Create Expectations & Obligations Table

**File:** `supabase/migrations/create_marriage_expectations_obligations.sql`

```sql
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
```

### 2. Update Certification Table

**File:** `supabase/migrations/update_certification_with_expectations.sql`

```sql
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
```

---

## 🎨 UI Implementation

### 1. Expectations & Obligations Screen

**File:** `app/(main)/profile/marriage-foundations/expectations.tsx`

**Flow:**
1. Show after course completion
2. Multi-step form with sections:
   - Financial Expectations
   - Lifestyle Expectations
   - Mahr Expectations
   - Family Expectations
   - Religious Expectations
   - Obligations (Husband/Wife based on gender)
3. Save progress (can come back later)
4. Final submission marks as complete

**Implementation:**

```tsx
import { useState } from "react";
import { ScrollView, View, Text, Pressable, Switch } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export default function ExpectationsScreen() {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState(0);
  const [expectations, setExpectations] = useState({
    financial: {},
    lifestyle: {},
    mahr: {},
    family: {},
    religious: {},
    obligations: {}
  });

  const sections = [
    { id: 'financial', title: 'Financial Expectations' },
    { id: 'lifestyle', title: 'Lifestyle Expectations' },
    { id: 'mahr', title: 'Mahr Expectations' },
    { id: 'family', title: 'Family Expectations' },
    { id: 'religious', title: 'Religious Expectations' },
    { id: 'obligations', title: 'My Obligations' }
  ];

  const saveMutation = useMutation({
    mutationFn: async (isComplete: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("marriage_expectations_obligations")
        .upsert({
          user_id: user.id,
          financial_expectations: expectations.financial,
          lifestyle_expectations: expectations.lifestyle,
          mahr_expectations: expectations.mahr,
          family_expectations: expectations.family,
          religious_expectations: expectations.religious,
          husband_obligations: expectations.obligations.husband || {},
          wife_obligations: expectations.obligations.wife || {},
          is_complete: isComplete,
          completed_at: isComplete ? new Date().toISOString() : null
        }, {
          onConflict: "user_id"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.is_complete) {
        router.push("/(main)/profile/marriage-foundations/certified");
      }
    }
  });

  return (
    <ScrollView className="flex-1 bg-black">
      {/* Progress Indicator */}
      <View className="px-4 py-4">
        <Text className="text-white text-lg font-semibold mb-2">
          Step {currentSection + 1} of {sections.length}
        </Text>
        <View className="h-2 bg-white/10 rounded-full">
          <View 
            className="h-full bg-[#B8860B] rounded-full"
            style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
          />
        </View>
      </View>

      {/* Section Content */}
      {currentSection === 0 && <FinancialExpectationsSection />}
      {currentSection === 1 && <LifestyleExpectationsSection />}
      {currentSection === 2 && <MahrExpectationsSection />}
      {currentSection === 3 && <FamilyExpectationsSection />}
      {currentSection === 4 && <ReligiousExpectationsSection />}
      {currentSection === 5 && <ObligationsSection />}

      {/* Navigation */}
      <View className="px-4 pb-6 flex-row justify-between">
        <Pressable
          onPress={() => currentSection > 0 && setCurrentSection(currentSection - 1)}
          disabled={currentSection === 0}
          className="px-6 py-3 bg-white/10 rounded-xl"
        >
          <Text className="text-white">Previous</Text>
        </Pressable>
        
        {currentSection < sections.length - 1 ? (
          <Pressable
            onPress={() => {
              saveMutation.mutate(false); // Save progress
              setCurrentSection(currentSection + 1);
            }}
            className="px-6 py-3 bg-[#B8860B] rounded-xl"
          >
            <Text className="text-black font-semibold">Next</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => saveMutation.mutate(true)} // Complete
            className="px-6 py-3 bg-[#B8860B] rounded-xl"
          >
            <Text className="text-black font-semibold">Complete & Certify</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
```

### 2. Section Components

**File:** `app/(main)/profile/marriage-foundations/expectations/sections/FinancialExpectations.tsx`

```tsx
export function FinancialExpectationsSection() {
  const [values, setValues] = useState({
    primary_provider: "",
    expected_income_range: "",
    financial_transparency: false,
    savings_expectations: ""
  });

  return (
    <View className="px-4 py-6">
      <Text className="text-white text-2xl font-bold mb-6">
        Financial Expectations
      </Text>
      
      {/* Primary Provider */}
      <View className="mb-6">
        <Text className="text-white text-base font-semibold mb-3">
          Who should be the primary provider?
        </Text>
        {["husband", "shared", "flexible"].map((option) => (
          <Pressable
            key={option}
            onPress={() => setValues({...values, primary_provider: option})}
            className={`p-4 rounded-xl mb-2 ${
              values.primary_provider === option 
                ? "bg-[#B8860B]" 
                : "bg-white/5"
            }`}
          >
            <Text className={`${
              values.primary_provider === option 
                ? "text-black" 
                : "text-white"
            }`}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Income Range */}
      <View className="mb-6">
        <Text className="text-white text-base font-semibold mb-3">
          Expected income range
        </Text>
        {["low", "medium", "high", "flexible"].map((option) => (
          <Pressable
            key={option}
            onPress={() => setValues({...values, expected_income_range: option})}
            className={`p-4 rounded-xl mb-2 ${
              values.expected_income_range === option 
                ? "bg-[#B8860B]" 
                : "bg-white/5"
            }`}
          >
            <Text className={`${
              values.expected_income_range === option 
                ? "text-black" 
                : "text-white"
            }`}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Financial Transparency */}
      <View className="mb-6">
        <Text className="text-white text-base font-semibold mb-3">
          Financial transparency is important to me
        </Text>
        <Switch
          value={values.financial_transparency}
          onValueChange={(val) => setValues({...values, financial_transparency: val})}
          trackColor={{ false: "#767577", true: "#B8860B" }}
        />
      </View>

      {/* Similar for other fields... */}
    </View>
  );
}
```

### 3. Obligations Section (Gender-Specific)

**File:** `app/(main)/profile/marriage-foundations/expectations/sections/ObligationsSection.tsx`

```tsx
export function ObligationsSection() {
  const { data: user } = useUser();
  const isMale = user?.gender === "male";
  
  const [obligations, setObligations] = useState({
    // Husband obligations
    provision: false,
    protection: false,
    emotional_support: false,
    fair_treatment: false,
    kindness: false,
    consultation: false,
    financial_responsibility: false,
    religious_leadership: false,
    // Wife obligations
    cooperation: false,
    respect: false,
    trust: false,
    emotional_stability: false,
    household_management: false,
    support_husband: false,
    privacy: false,
    religious_observance: false
  });

  const husbandObligations = [
    { key: "provision", label: "Provide for family financially" },
    { key: "protection", label: "Protect and safeguard family" },
    { key: "emotional_support", label: "Provide emotional support" },
    { key: "fair_treatment", label: "Treat spouse fairly and justly" },
    { key: "kindness", label: "Show kindness and gentleness" },
    { key: "consultation", label: "Consult in family matters" },
    { key: "financial_responsibility", label: "Take financial responsibility" },
    { key: "religious_leadership", label: "Provide religious leadership" }
  ];

  const wifeObligations = [
    { key: "cooperation", label: "Cooperate and support husband" },
    { key: "respect", label: "Respect husband's leadership" },
    { key: "trust", label: "Trust and support decisions" },
    { key: "emotional_stability", label: "Provide emotional stability" },
    { key: "household_management", label: "Manage household affairs" },
    { key: "support_husband", label: "Support husband's goals" },
    { key: "privacy", label: "Maintain privacy and modesty" },
    { key: "religious_observance", label: "Maintain religious observance" }
  ];

  return (
    <View className="px-4 py-6">
      <Text className="text-white text-2xl font-bold mb-2">
        My Obligations
      </Text>
      <Text className="text-white/70 text-sm mb-6">
        Select the obligations you commit to fulfilling in marriage
      </Text>

      {isMale ? (
        <>
          <Text className="text-white text-lg font-semibold mb-4">
            As a Husband, I commit to:
          </Text>
          {husbandObligations.map((obligation) => (
            <View key={obligation.key} className="flex-row items-center justify-between mb-4 p-4 bg-white/5 rounded-xl">
              <Text className="text-white flex-1">{obligation.label}</Text>
              <Switch
                value={obligations[obligation.key]}
                onValueChange={(val) => 
                  setObligations({...obligations, [obligation.key]: val})
                }
                trackColor={{ false: "#767577", true: "#B8860B" }}
              />
            </View>
          ))}
        </>
      ) : (
        <>
          <Text className="text-white text-lg font-semibold mb-4">
            As a Wife, I commit to:
          </Text>
          {wifeObligations.map((obligation) => (
            <View key={obligation.key} className="flex-row items-center justify-between mb-4 p-4 bg-white/5 rounded-xl">
              <Text className="text-white flex-1">{obligation.label}</Text>
              <Switch
                value={obligations[obligation.key]}
                onValueChange={(val) => 
                  setObligations({...obligations, [obligation.key]: val})
                }
                trackColor={{ false: "#767577", true: "#B8860B" }}
              />
            </View>
          ))}
        </>
      )}
    </View>
  );
}
```

### 4. Update Certification Success Screen

**File:** `app/(main)/profile/marriage-foundations/certified.tsx`

Add navigation to expectations if not completed:

```tsx
// Check if expectations are completed
const { data: expectations } = useQuery({
  queryKey: ["marriage-expectations", user?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from("marriage_expectations_obligations")
      .select("*")
      .eq("user_id", user.id)
      .single();
    return data;
  }
});

// If not completed, show button to complete
{!expectations?.is_complete && (
  <Pressable
    onPress={() => router.push("/(main)/profile/marriage-foundations/expectations")}
    className="bg-[#B8860B] rounded-xl py-4 px-6 mb-3"
  >
    <Text className="text-black text-center font-bold text-base">
      Complete Expectations & Obligations
    </Text>
  </Pressable>
)}
```

### 5. Update Course Overview

**File:** `app/(main)/profile/marriage-foundations/index.tsx`

Add expectations completion status:

```tsx
const { data: expectations } = useQuery({
  queryKey: ["marriage-expectations", user?.id],
  queryFn: async () => {
    if (!user?.id) return null;
    const { data } = await supabase
      .from("marriage_expectations_obligations")
      .select("is_complete")
      .eq("user_id", user.id)
      .single();
    return data;
  }
});

// Show expectations card if course completed but expectations not done
{certification?.is_certified && !expectations?.is_complete && (
  <Pressable
    onPress={() => router.push("/(main)/profile/marriage-foundations/expectations")}
    className="bg-[#B8860B]/20 border border-[#B8860B]/50 rounded-xl p-4 mb-4"
  >
    <Text className="text-[#B8860B] font-semibold text-base mb-2">
      Complete Your Expectations & Obligations
    </Text>
    <Text className="text-white/70 text-sm">
      Set your expectations and commitments to complete your certification
    </Text>
  </Pressable>
)}
```

---

## 📱 Display on Profile

### 1. Expectations Display Component

**File:** `components/ExpectationsDisplay.tsx`

```tsx
export function ExpectationsDisplay({ userId }: { userId: string }) {
  const { data: expectations } = useExpectations(userId);
  
  if (!expectations?.is_complete) return null;
  
  return (
    <View className="bg-white/5 rounded-2xl p-4 mb-4">
      <Text className="text-white text-lg font-semibold mb-4">
        Expectations & Commitments
      </Text>
      
      {/* Financial */}
      {expectations.financial_expectations && (
        <View className="mb-3">
          <Text className="text-[#B8860B] text-sm font-semibold mb-1">
            Financial
          </Text>
          <Text className="text-white/70 text-sm">
            Primary provider: {expectations.financial_expectations.primary_provider}
          </Text>
        </View>
      )}
      
      {/* Similar for other sections... */}
      
      {/* Obligations Summary */}
      <View className="mt-4 pt-4 border-t border-white/10">
        <Text className="text-[#B8860B] text-sm font-semibold mb-2">
          Committed Obligations
        </Text>
        {/* List selected obligations */}
      </View>
    </View>
  );
}
```

### 2. Add to Profile Screen

**File:** `app/(main)/profile/index.tsx`

```tsx
import { ExpectationsDisplay } from "@/components/ExpectationsDisplay";

// In profile render:
<ExpectationsDisplay userId={user.id} />
```

---

## 🔄 Compatibility Matching

### 1. Compatibility Calculation

**File:** `lib/utils/compatibility.ts`

```tsx
export function calculateExpectationsCompatibility(
  user1Expectations: any,
  user2Expectations: any
): number {
  let score = 0;
  let total = 0;
  
  // Financial compatibility
  if (user1Expectations.financial_expectations?.primary_provider === 
      user2Expectations.financial_expectations?.primary_provider) {
    score += 20;
  }
  total += 20;
  
  // Lifestyle compatibility
  // ... calculate based on lifestyle expectations
  
  // Mahr compatibility
  // ... calculate based on mahr expectations
  
  // Family compatibility
  // ... calculate based on family expectations
  
  // Religious compatibility
  // ... calculate based on religious expectations
  
  // Obligations alignment
  // ... check if obligations match expectations
  
  return Math.round((score / total) * 100);
}
```

---

## 🎯 Implementation Steps

1. **Create Database Migrations**
   - `create_marriage_expectations_obligations.sql`
   - `update_certification_with_expectations.sql`

2. **Create UI Screens**
   - Expectations form screen
   - Section components
   - Update certification success screen

3. **Create Hooks**
   - `useExpectations` - Fetch/save expectations
   - `useCompatibility` - Calculate compatibility

4. **Update Certification Flow**
   - Require expectations completion
   - Update certification trigger

5. **Display on Profiles**
   - Expectations component
   - Obligations summary

6. **Integration**
   - Add to profile screen
   - Use for compatibility matching
   - Show in swipe cards

---

## ✅ Testing Checklist

- [ ] User completes course
- [ ] Expectations screen appears
- [ ] All sections can be filled
- [ ] Progress saves correctly
- [ ] Completion triggers certification
- [ ] Expectations display on profile
- [ ] Compatibility calculation works
- [ ] RLS policies work correctly

---

**Status:** Ready for implementation. Start with database migrations, then build UI components.


