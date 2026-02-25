# Marriage Foundations Course - Setup Guide

## ✅ Completed Implementation

The Marriage Foundations Course feature has been fully implemented with the following components:

### 1. Database Schema ✅
- `marriage_course_modules` - Stores course modules
- `marriage_course_quiz_questions` - Stores quiz questions
- `marriage_course_user_progress` - Tracks user progress
- `marriage_course_certifications` - Stores certification status
- Automatic certification update function via trigger

### 2. UI Components ✅
- **Course Overview Screen** (`app/(main)/profile/marriage-foundations/index.tsx`)
  - Progress tracker
  - Module list with status indicators
  - Locked/unlocked logic
  
- **Module Detail Screen** (`app/(main)/profile/marriage-foundations/[moduleId].tsx`)
  - Video player with progress tracking
  - Key takeaways display
  - Mark as watched functionality
  - Quiz navigation

- **Quiz Screen** (`app/(main)/profile/marriage-foundations/[moduleId]/quiz.tsx`)
  - Scenario-based questions
  - Multiple choice answers
  - Score calculation (80% passing threshold)
  - Explanations after submission
  - Retake functionality

- **Certification Success Screen** (`app/(main)/profile/marriage-foundations/certified.tsx`)
  - Celebration animation
  - Badge preview
  - Certification date display

### 3. Badge Integration ✅
- **Profile Screen** - Badge next to user's name
- **Swipe Cards** - Badge on profile cards
- **Chat Header** - Badge next to other user's name

### 4. Entry Points ✅
- **Profile Section** - Course card with progress
- **Settings Menu** - Course menu item with completion status

### 5. Custom Hooks ✅
- `useMarriageCourse` - Course data and progress management
- `useCertification` - Certification status management

---

## 📋 Next Steps (Required)

### 1. Run Database Migrations

Execute these migration files in your Supabase dashboard:

1. `supabase/migrations/create_marriage_course_modules.sql`
2. `supabase/migrations/create_marriage_course_quizzes.sql`
3. `supabase/migrations/create_marriage_course_progress.sql`
4. `supabase/migrations/create_marriage_course_certification.sql`
5. `supabase/migrations/create_update_certification_function.sql`

**How to run:**
- Go to Supabase Dashboard → SQL Editor
- Copy and paste each migration file
- Execute them in order

### 2. Create Course Content

You need to create the actual course modules and quiz questions. Create a seed file:

**File:** `supabase/seed_marriage_course_content.sql`

**Example structure:**

```sql
-- Insert Module 1
INSERT INTO public.marriage_course_modules (
  module_number, title, description, video_url, video_duration_seconds, key_takeaways
) VALUES (
  1,
  'Why Marriage Matters in Islam',
  'Understanding the spiritual and practical importance of marriage in Islam.',
  'https://your-video-url.com/module1.mp4', -- Replace with actual video URL
  240, -- 4 minutes
  ARRAY[
    'Marriage is an act of worship (Sunnah)',
    'Provides tranquility, mercy, and companionship',
    'Requires serious intentions and responsibility',
    'Not just a cultural tradition, but a spiritual commitment'
  ]
);

-- Insert Quiz Questions for Module 1
INSERT INTO public.marriage_course_quiz_questions (
  module_id, question_text, question_type, options, explanation, display_order
) VALUES (
  (SELECT id FROM marriage_course_modules WHERE module_number = 1),
  'A spouse is overwhelmed emotionally after a difficult day at work. What is the best Islamic approach?',
  'scenario',
  '[
    {"id": "a", "text": "Tell them to ''get over it'' and focus on responsibilities", "is_correct": false},
    {"id": "b", "text": "Listen with empathy, offer support, and help find solutions together", "is_correct": true},
    {"id": "c", "text": "Ignore it and wait for them to come to you", "is_correct": false},
    {"id": "d", "text": "Compare their situation to your own struggles", "is_correct": false}
  ]'::jsonb,
  'The Prophet (peace be upon him) emphasized kindness and emotional support. Listening with empathy and offering help demonstrates the mercy and tranquility that marriage should provide.',
  1
);

-- Repeat for all 8 modules...
```

**Modules to create:**
1. Why Marriage Matters in Islam
2. Marriage is a Partnership
3. Values of a Husband
4. Values of a Wife
5. Mutual Rights and Responsibilities
6. Conflict & Communication
7. Culture vs Islam
8. Modern Realities & Readiness

### 3. Video Storage

**Option A: Supabase Storage (Recommended for privacy)**
1. Create a storage bucket: `marriage-course-videos`
2. Upload videos to the bucket
3. Get public URLs or use signed URLs
4. Update `video_url` in modules table

**Option B: External CDN (YouTube, Vimeo)**
1. Upload videos to your preferred platform
2. Get embed URLs
3. Update `video_url` in modules table

### 4. Update Swipe Feed to Include Certification

The swipe feed edge function needs to be updated to include certification status so badges can display on swipe cards.

**File:** `supabase/functions/get_swipe_feed/index.ts`

**Add this to the profile query (around line 196):**

```typescript
// Add certification status to profiles
const { data: certifications } = await supabaseClient
  .from("marriage_course_certifications")
  .select("user_id, is_certified, show_badge")
  .in("user_id", allProfiles.map((p: any) => p.id));

// Create a map for quick lookup
const certificationMap = new Map();
certifications?.forEach((cert: any) => {
  if (cert.is_certified && cert.show_badge) {
    certificationMap.set(cert.user_id, true);
  }
});

// Add certification status to each profile
const profilesWithCertification = allProfiles.map((profile: any) => ({
  ...profile,
  is_certified: certificationMap.has(profile.id),
  show_badge: certificationMap.has(profile.id),
}));
```

Then use `profilesWithCertification` instead of `allProfiles` when filtering and returning results.

### 5. Add Discovery Filter (Optional)

To add a filter for "Show only certified users":

**File:** `app/(main)/swipe/filters/index.tsx`

Add a toggle option that filters profiles by certification status. You'll need to:
1. Add filter state
2. Pass filter to swipe feed function
3. Update edge function to filter by certification

### 6. Add Badge to User Profile Views

The badge is already added to:
- ✅ Profile screen (own profile)
- ✅ Swipe cards
- ✅ Chat header

**Still needed:**
- `app/(main)/chat/user-profile.tsx` - Add badge to other user's profile view
- `components/LikesProfileView.tsx` - Add badge to likes profile view

**Example addition:**

```tsx
import { MarriageFoundationsBadge } from "../../../components/MarriageFoundationsBadge";
import { useCertification } from "../../../lib/hooks/useCertification";

// In component:
const { data: certification } = useCertification(profile.id);

// In render (near name):
{certification?.is_certified && certification?.show_badge && (
  <MarriageFoundationsBadge size="small" showText={false} />
)}
```

### 7. Optional Onboarding Prompt

To add an optional onboarding prompt after user completes registration:

**File:** `app/(auth)/onboarding/done.tsx`

Add a section that prompts users to start the course:

```tsx
import { useCertification } from "../../../lib/hooks/useCertification";

// In component:
const { data: certification } = useCertification();
const hasCompletedCourse = certification?.is_certified || false;

// In render:
{!hasCompletedCourse && (
  <View className="bg-[#B8860B]/20 border border-[#B8860B]/50 rounded-2xl p-4 mb-4">
    <Text className="text-white text-base font-semibold mb-2">
      Increase Your Match Quality
    </Text>
    <Text className="text-white/80 text-sm mb-3">
      Complete our Marriage Foundations Course to earn a certification badge that shows you understand Islamic marriage expectations.
    </Text>
    <Pressable
      onPress={() => router.push("/(main)/profile/marriage-foundations")}
      className="bg-[#B8860B] rounded-xl py-3 px-4"
    >
      <Text className="text-black text-center font-semibold">
        Start Course
      </Text>
    </Pressable>
  </View>
)}
```

---

## 🧪 Testing Checklist

After setup, test the following:

- [ ] Course overview screen loads
- [ ] Modules display in correct order
- [ ] Module locking works (can't access module 2 before completing module 1)
- [ ] Video plays correctly
- [ ] "Mark as Watched" works
- [ ] Quiz questions load
- [ ] Quiz scoring works (80% threshold)
- [ ] Quiz retakes work
- [ ] Certification is awarded when all modules completed
- [ ] Badge displays on profile
- [ ] Badge displays on swipe cards
- [ ] Badge displays in chat header
- [ ] Progress persists across app restarts
- [ ] Settings menu shows course completion status

---

## 📝 Notes

1. **Video URLs**: Replace placeholder URLs with actual video URLs once videos are uploaded.

2. **Quiz Questions**: Create 3-6 scenario-based questions per module. Focus on practical understanding, not academic knowledge.

3. **Content Guidelines**: 
   - Keep videos 2-5 minutes
   - Use calm, non-judgmental tone
   - Focus on widely accepted Islamic principles
   - Avoid controversial fiqh debates

4. **Badge Visibility**: Users can toggle badge visibility in their certification settings (future enhancement).

5. **Performance**: The certification trigger automatically updates certification status when progress changes. No manual intervention needed.

---

## 🚀 Launch Checklist

Before launching:

1. ✅ Run all database migrations
2. ✅ Seed course modules and quiz questions
3. ✅ Upload videos to storage/CDN
4. ✅ Update swipe feed function to include certification
5. ✅ Test complete flow end-to-end
6. ✅ Verify badges display correctly
7. ✅ Test on both iOS and Android
8. ✅ Monitor for any errors in production

---

## 📚 Additional Resources

- See `MARRIAGE_FOUNDATIONS_IMPLEMENTATION.md` for detailed implementation plan
- See `components/MarriageFoundationsBadge.tsx` for badge component
- See `lib/hooks/useMarriageCourse.ts` for course data hooks
- See `lib/hooks/useCertification.ts` for certification hooks

---

**Status:** ✅ Core implementation complete. Ready for content creation and testing.


