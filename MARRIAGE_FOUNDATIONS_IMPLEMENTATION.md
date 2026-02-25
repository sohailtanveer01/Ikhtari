# Marriage Foundations Course - Implementation Plan

## Overview

This document outlines the complete implementation plan for the Marriage Foundations Course feature - an in-app educational course that teaches users about Islamic marriage values and responsibilities, with certification and badge system.

---

## 1. Database Schema

### 1.1 Course Modules Table

```sql
-- Migration: supabase/migrations/create_marriage_course_modules.sql

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
```

### 1.2 Quiz Questions Table

```sql
-- Migration: supabase/migrations/create_marriage_course_quizzes.sql

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
```

### 1.3 User Progress Table

```sql
-- Migration: supabase/migrations/create_marriage_course_progress.sql

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
```

### 1.4 User Certification Table

```sql
-- Migration: supabase/migrations/create_marriage_course_certification.sql

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
```

### 1.5 Add Certification Field to Users Table

```sql
-- Migration: supabase/migrations/add_certification_to_users.sql

-- Add a computed/joined field is not needed if we use the certifications table
-- But we can add a helper function to check certification status

CREATE OR REPLACE FUNCTION public.is_user_certified(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_certified AND show_badge 
     FROM public.marriage_course_certifications 
     WHERE user_id = user_uuid),
    false
  );
$$ LANGUAGE sql STABLE;
```

### 1.6 Function to Update Certification Status

```sql
-- Migration: supabase/migrations/create_update_certification_function.sql

CREATE OR REPLACE FUNCTION public.update_marriage_course_certification()
RETURNS TRIGGER AS $$
DECLARE
  total_modules INTEGER;
  completed_modules INTEGER;
  all_completed BOOLEAN;
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
  all_completed := (completed_modules >= total_modules);
  
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
    CASE WHEN all_completed AND NOT EXISTS (
      SELECT 1 FROM public.marriage_course_certifications WHERE user_id = NEW.user_id AND is_certified = true
    ) THEN now() ELSE NULL END,
    CASE WHEN total_modules > 0 THEN ROUND((completed_modules::NUMERIC / total_modules::NUMERIC) * 100) ELSE 0 END,
    completed_modules,
    total_modules
  )
  ON CONFLICT (user_id) DO UPDATE SET
    is_certified = all_completed,
    certified_at = CASE 
      WHEN all_completed AND certified_at IS NULL THEN now()
      ELSE marriage_course_certifications.certified_at
    END,
    completion_percentage = CASE WHEN total_modules > 0 THEN ROUND((completed_modules::NUMERIC / total_modules::NUMERIC) * 100) ELSE 0 END,
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
```

---

## 2. Course Content Structure

### 2.1 Module Content Data

Create a seed file: `supabase/seed_marriage_course_modules.sql`

**Module 1: Why Marriage Matters in Islam**
- Video: 3-4 minutes
- Key Takeaways:
  - Marriage is an act of worship (Sunnah)
  - Provides tranquility, mercy, and companionship
  - Requires serious intentions and responsibility
  - Not just a cultural tradition, but a spiritual commitment

**Module 2: Marriage is a Partnership**
- Video: 3-4 minutes
- Key Takeaways:
  - Not about control or dominance
  - Not a transaction or business deal
  - Built on teamwork, consultation, and kindness
  - Mutual respect and support

**Module 3: Values of a Husband**
- Video: 4-5 minutes
- Key Takeaways:
  - Responsibility for provision and protection
  - Emotional safety and support
  - Leadership through service, not harshness
  - Kindness and gentleness (following Prophet's example)

**Module 4: Values of a Wife**
- Video: 4-5 minutes
- Key Takeaways:
  - Cooperation and partnership
  - Trust and respect for husband's leadership
  - Emotional stability and support
  - Avoiding cultural extremes

**Module 5: Mutual Rights and Responsibilities**
- Video: 4-5 minutes
- Key Takeaways:
  - Kindness and intimacy
  - Communication and privacy
  - No harm principle
  - Fairness and patience

**Module 6: Conflict & Communication**
- Video: 4-5 minutes
- Key Takeaways:
  - How to disagree respectfully
  - Repair and forgiveness
  - Setting boundaries
  - Avoiding escalation

**Module 7: Culture vs Islam**
- Video: 3-4 minutes
- Key Takeaways:
  - Identifying cultural baggage
  - Avoiding abuse, entitlement, manipulation
  - Distinguishing cultural practices from Islamic obligations
  - Respecting differences while maintaining Islamic principles

**Module 8: Modern Realities & Readiness**
- Video: 4-5 minutes
- Key Takeaways:
  - Balancing work, finances, and family
  - Social media boundaries
  - Family involvement and boundaries
  - Personal readiness reflection

### 2.2 Quiz Questions Format

Each module should have 3-6 scenario-based questions. Example format:

```json
{
  "module_id": "uuid",
  "question_text": "A spouse is overwhelmed emotionally after a difficult day at work. What is the best Islamic approach?",
  "question_type": "scenario",
  "options": [
    {"id": "a", "text": "Tell them to 'get over it' and focus on responsibilities", "is_correct": false},
    {"id": "b", "text": "Listen with empathy, offer support, and help find solutions together", "is_correct": true},
    {"id": "c", "text": "Ignore it and wait for them to come to you", "is_correct": false},
    {"id": "d", "text": "Compare their situation to your own struggles", "is_correct": false}
  ],
  "explanation": "The Prophet (peace be upon him) emphasized kindness and emotional support. Listening with empathy and offering help demonstrates the mercy and tranquility that marriage should provide."
}
```

---

## 3. UI Components & Screens

### 3.1 Course Overview Screen

**File:** `app/(main)/profile/marriage-foundations/index.tsx`

**Features:**
- Progress tracker (0-100%)
- List of modules with status:
  - 🔒 Locked (if previous not completed)
  - ⏸️ Not started
  - ▶️ In progress
  - ✅ Completed
- Module cards showing:
  - Title and description
  - Estimated time
  - Status badge
  - Progress indicator
- "Start Course" or "Continue Course" button
- Certification badge preview (if earned)

**Design:**
- Clean, modern, educational feel
- Calm colors (blues, greens, gold accents)
- Non-judgmental tone
- Premium quality UI

### 3.2 Module Detail Screen

**File:** `app/(main)/profile/marriage-foundations/[moduleId].tsx`

**Features:**
- Video player (using `expo-av` or `react-native-video`)
- Video progress tracking
- "Mark as Watched" button (or auto-mark at 90%+ watched)
- Key Takeaways section (expandable cards)
- "Take Quiz" button (enabled after video watched)
- Progress indicator
- Navigation: Previous/Next module buttons

**Design:**
- Full-screen video option
- Clean typography for takeaways
- Smooth transitions

### 3.3 Quiz Screen

**File:** `app/(main)/profile/marriage-foundations/[moduleId]/quiz.tsx`

**Features:**
- Question-by-question flow (or all at once)
- Scenario-based questions with multiple choice
- Progress indicator (Question 2 of 5)
- Submit button
- Results screen showing:
  - Score (X/Y correct)
  - Pass/Fail status (80% threshold)
  - Explanation for each question
  - "Retake Quiz" button (if failed)
  - "Continue to Next Module" button (if passed)

**Design:**
- Clear question formatting
- Large, readable options
- Non-shaming feedback
- Encouraging tone

### 3.4 Certification Success Screen

**File:** `app/(main)/profile/marriage-foundations/certified.tsx`

**Features:**
- Celebration animation
- "You are now Marriage Foundations Certified" message
- Badge preview
- "Certified on [Date]" display
- "View Profile" button
- "Share Achievement" option (optional)

**Design:**
- Celebratory but respectful
- Gold/bronze badge design
- Professional certificate feel

---

## 4. Badge Integration

### 4.1 Badge Component

**File:** `components/MarriageFoundationsBadge.tsx`

```tsx
export function MarriageFoundationsBadge({ 
  size = 'medium',
  showText = true 
}: {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}) {
  // Badge icon + "Marriage Foundations Certified" text
  // Gold/bronze color scheme
  // Responsive sizing
}
```

### 4.2 Integration Points

**Profile Header** (`app/(main)/profile/index.tsx`):
- Add badge next to name or below profile photo
- Show "Certified on [Date]" tooltip

**Swipe Cards** (`components/SwipeCard.tsx`):
- Small badge icon in corner or below name
- Subtle, doesn't distract from photo

**Chat Header** (`app/(main)/chat/[chatId].tsx`):
- Badge next to other user's name in header
- Indicates they understand marriage expectations

**Profile Preview** (`app/(main)/profile/preview.tsx`):
- Badge in profile preview
- Shows how others see your profile

**User Profile View** (`app/(main)/chat/user-profile.tsx`):
- Badge in profile view
- Trust signal for potential matches

### 4.3 Badge Display Logic

```tsx
// Check if user is certified and badge is visible
const { data: certification } = await supabase
  .from('marriage_course_certifications')
  .select('is_certified, show_badge, certified_at')
  .eq('user_id', userId)
  .single();

const showBadge = certification?.is_certified && certification?.show_badge;
```

---

## 5. Entry Points

### 5.1 Profile Section

**File:** `app/(main)/profile/index.tsx`

Add a new section card:
```tsx
<Pressable
  onPress={() => router.push('/(main)/profile/marriage-foundations')}
  className="bg-white/5 rounded-2xl p-4 mb-4"
>
  <View className="flex-row items-center justify-between">
    <View className="flex-1">
      <Text className="text-white text-lg font-semibold mb-1">
        Marriage Foundations Course
      </Text>
      <Text className="text-white/70 text-sm">
        Learn Islamic marriage values and earn certification
      </Text>
      {certificationProgress > 0 && (
        <Text className="text-[#B8860B] text-xs mt-2">
          {certificationProgress}% Complete
        </Text>
      )}
    </View>
    <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
  </View>
</Pressable>
```

### 5.2 Settings Menu

**File:** `app/(main)/profile/settings.tsx`

Add menu item:
```tsx
<Pressable
  onPress={() => router.push('/(main)/profile/marriage-foundations')}
  className="flex-row items-center justify-between py-4 border-b border-white/10"
>
  <View className="flex-row items-center flex-1">
    <Ionicons name="school-outline" size={24} color="#B8860B" />
    <Text className="text-white text-base ml-3">Marriage Foundations Course</Text>
  </View>
  {isCertified && (
    <View className="bg-[#B8860B] px-2 py-1 rounded">
      <Text className="text-black text-xs font-bold">Certified</Text>
    </View>
  )}
  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
</Pressable>
```

### 5.3 Optional Onboarding Step

**File:** `app/(auth)/onboarding/done.tsx` or new screen

Add optional prompt:
```tsx
{!hasCompletedCourse && (
  <View className="bg-[#B8860B]/20 border border-[#B8860B]/50 rounded-2xl p-4 mb-4">
    <Text className="text-white text-base font-semibold mb-2">
      Increase Your Match Quality
    </Text>
    <Text className="text-white/80 text-sm mb-3">
      Complete our Marriage Foundations Course to earn a certification badge that shows you understand Islamic marriage expectations.
    </Text>
    <Pressable
      onPress={() => router.push('/(main)/profile/marriage-foundations')}
      className="bg-[#B8860B] rounded-xl py-3 px-4"
    >
      <Text className="text-black text-center font-semibold">
        Start Course
      </Text>
    </Pressable>
  </View>
)}
```

### 5.4 Discovery Filter

**File:** `app/(main)/swipe/filters/index.tsx` or new filter screen

Add filter option:
```tsx
<View className="mb-4">
  <Text className="text-white text-base font-semibold mb-2">
    Certification
  </Text>
  <Pressable
    onPress={() => setShowOnlyCertified(!showOnlyCertified)}
    className="flex-row items-center justify-between bg-white/5 rounded-xl p-4"
  >
    <View className="flex-row items-center">
      <Ionicons 
        name={showOnlyCertified ? "checkbox" : "square-outline"} 
        size={24} 
        color={showOnlyCertified ? "#B8860B" : "#9CA3AF"} 
      />
      <Text className="text-white ml-3">
        Show only certified users
      </Text>
    </View>
  </Pressable>
</View>
```

Update swipe feed query to filter by certification status.

---

## 6. Implementation Steps

### Step 1: Database Setup
1. Create all migration files
2. Run migrations in Supabase
3. Seed course modules and quiz questions
4. Test RLS policies

### Step 2: Core Course UI
1. Create course overview screen
2. Create module detail screen
3. Integrate video player
4. Add progress tracking

### Step 3: Quiz System
1. Create quiz screen
2. Implement question flow
3. Add scoring logic
4. Create results screen
5. Add retake functionality

### Step 4: Certification Logic
1. Implement certification update function
2. Create certification success screen
3. Add badge component
4. Test certification flow

### Step 5: Badge Integration
1. Add badge to profile
2. Add badge to swipe cards
3. Add badge to chat header
4. Add badge to user profile views

### Step 6: Entry Points
1. Add to profile section
2. Add to settings menu
3. Add optional onboarding prompt
4. Add discovery filter

### Step 7: Testing & Polish
1. Test complete flow
2. Test edge cases (network errors, partial completion)
3. Polish UI/UX
4. Add loading states
5. Add error handling

---

## 7. Technical Considerations

### 7.1 Video Storage

**Option 1: Supabase Storage**
- Upload videos to `marriage-course-videos` bucket
- Use signed URLs for access
- Good for control and privacy

**Option 2: External CDN (YouTube, Vimeo)**
- Embed videos
- Better for bandwidth
- Less control over access

**Recommendation:** Start with Supabase Storage for privacy, can migrate to CDN later.

### 7.2 Video Player Library

Use `expo-av` (already in project) or `react-native-video`:
- `expo-av`: Built-in, simpler
- `react-native-video`: More features, better performance

**Recommendation:** Use `expo-av` for simplicity.

### 7.3 Progress Tracking

Track video progress:
- Mark as "watched" when user reaches 90%+ of video
- Or provide "Mark as Watched" button
- Store progress in `video_progress_percent`

### 7.4 Quiz Passing Threshold

- Default: 80% correct
- Configurable per module (if needed)
- Allow unlimited retakes
- Store best score

### 7.5 Module Locking

- Sequential: Module 2 unlocks after Module 1 completed
- Or: Allow free navigation, but certification requires all completed
- Add toggle in settings for "Free Navigation" mode

---

## 8. Content Guidelines

### 8.1 Tone & Style

- **Calm**: No urgency or pressure
- **Modern**: Relatable to contemporary Muslims
- **Non-judgmental**: Avoid shaming or guilt-tripping
- **Inclusive**: Respect different backgrounds and experiences
- **Educational**: Focus on learning, not preaching

### 8.2 Content Sources

- Quranic verses (with context)
- Hadith (authenticated)
- Scholarly consensus (avoid controversial fiqh)
- Practical examples
- Real-world scenarios

### 8.3 Video Production

- Professional but approachable presenter
- Clear audio and visuals
- Subtitles/transcripts (accessibility)
- 2-5 minutes per module (respect attention span)
- Engaging but respectful

---

## 9. Future Enhancements

1. **Certification Expiration**: Require renewal after X years
2. **Advanced Modules**: Optional advanced topics
3. **Community Discussion**: Forum for course graduates
4. **Progress Sharing**: Optional social sharing
5. **Gamification**: Points, achievements, streaks
6. **Multi-language**: Arabic, Urdu, etc.
7. **Audio-only Mode**: For accessibility
8. **Download for Offline**: Watch videos offline

---

## 10. Testing Checklist

- [ ] User can access course from profile
- [ ] User can access course from settings
- [ ] Modules display in correct order
- [ ] Module locking works (if enabled)
- [ ] Video plays correctly
- [ ] Video progress tracks accurately
- [ ] Key takeaways display correctly
- [ ] Quiz questions load correctly
- [ ] Quiz scoring works (80% threshold)
- [ ] Quiz retakes work
- [ ] Certification awarded when all modules completed
- [ ] Badge displays on profile
- [ ] Badge displays on swipe cards
- [ ] Badge displays in chat
- [ ] Badge toggle works (show/hide)
- [ ] Filter for certified users works
- [ ] Progress persists across sessions
- [ ] Error handling works (network errors, etc.)
- [ ] RLS policies work correctly
- [ ] Performance is acceptable (no lag)

---

## 11. File Structure

```
app/(main)/profile/
  marriage-foundations/
    index.tsx                    # Course overview
    [moduleId].tsx               # Module detail (video + takeaways)
    [moduleId]/
      quiz.tsx                   # Quiz screen
    certified.tsx                # Certification success screen

components/
  MarriageFoundationsBadge.tsx   # Badge component

supabase/
  migrations/
    create_marriage_course_modules.sql
    create_marriage_course_quizzes.sql
    create_marriage_course_progress.sql
    create_marriage_course_certification.sql
    create_update_certification_function.sql
    add_certification_to_users.sql
  seed_marriage_course_modules.sql
  seed_marriage_course_quizzes.sql

lib/
  hooks/
    useMarriageCourse.ts         # Custom hook for course data
    useCertification.ts          # Custom hook for certification status
```

---

## 12. Next Steps

1. **Review this plan** with the team
2. **Create database migrations** and test in development
3. **Design UI mockups** for key screens
4. **Create course content** (videos, questions)
5. **Implement core screens** (overview, module, quiz)
6. **Integrate badges** across the app
7. **Add entry points** (profile, settings, onboarding)
8. **Test thoroughly** before release
9. **Launch** with optional onboarding prompt
10. **Monitor** completion rates and user feedback

---

This implementation plan provides a complete roadmap for building the Marriage Foundations Course feature. Start with the database schema, then build the UI components, and finally integrate the badges and entry points.


