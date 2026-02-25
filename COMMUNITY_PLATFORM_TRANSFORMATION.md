# Community Platform Transformation - Implementation Plan

## Overview

This document outlines the complete implementation plan to transform the app from a dating-focused platform to a comprehensive **Muslim Lifestyle & Community Platform** with marriage-focused matching as one feature among many.

**Key Transformation:**
- **From:** Dating app with swipe feature
- **To:** Muslim community platform with "Meet Prospective Spouse" as one tab among community features

---

## 🎯 Strategic Goals

1. **App Store Compliance:** Position as community/lifestyle app, not dating app
2. **Islamic Values:** Emphasize marriage, respect, and community
3. **User Safety:** Mandatory verification, chaperoned chat, clear guidelines
4. **Community First:** Events, education, discussions, business directory
5. **Marriage Focus:** Structured compatibility, family involvement, mahr discussions

---

## 📋 Implementation Phases

### **Phase 1: Foundation & Database Schema** (Week 1-2)

#### 1.1 Database Schema Changes

**New Tables:**

```sql
-- User verification & safety
CREATE TABLE user_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  photo_verified BOOLEAN DEFAULT false,
  id_verified BOOLEAN DEFAULT false,
  id_document_url TEXT, -- Encrypted/stored securely
  verification_status TEXT DEFAULT 'pending', -- pending, approved, rejected
  verified_at TIMESTAMPTZ,
  verified_by UUID, -- Admin user ID
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Compatibility questions & answers
CREATE TABLE compatibility_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL, -- deen, madhhab, lifestyle, family_expectations, mahr
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice', -- multiple_choice, text, scale
  options JSONB, -- For multiple choice
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE user_compatibility_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES compatibility_questions(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT,
  answer_value JSONB, -- For complex answers
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, question_id)
);

-- Compatibility summaries (calculated)
CREATE TABLE compatibility_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  deen_compatibility INTEGER, -- 0-100
  madhhab_compatibility INTEGER,
  lifestyle_compatibility INTEGER,
  family_expectations_compatibility INTEGER,
  mahr_compatibility INTEGER,
  overall_compatibility INTEGER,
  compatibility_details JSONB, -- Detailed breakdown
  calculated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user1_id, user2_id)
);

-- Chaperoned chats
CREATE TABLE chat_chaperones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  chaperone_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES users(id) NOT NULL, -- Who invited the chaperone
  status TEXT DEFAULT 'pending', -- pending, accepted, declined
  can_view_history BOOLEAN DEFAULT false, -- Can see past messages
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(chat_id, chaperone_user_id)
);

-- Community features
CREATE TABLE community_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL, -- masjid_event, class, qa_session, community_group
  location TEXT,
  location_coords GEOGRAPHY(POINT, 4326),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  organizer_id UUID REFERENCES users(id),
  max_attendees INTEGER,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE event_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES community_events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'registered', -- registered, attended, cancelled
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(event_id, user_id)
);

CREATE TABLE community_discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT, -- general, fiqh, marriage, community
  author_id UUID REFERENCES users(id) NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE discussion_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discussion_id UUID REFERENCES community_discussions(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  parent_reply_id UUID REFERENCES discussion_replies(id), -- For nested replies
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE halal_businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- restaurant, shop, service, etc.
  location TEXT NOT NULL,
  location_coords GEOGRAPHY(POINT, 4326),
  phone TEXT,
  website TEXT,
  verified BOOLEAN DEFAULT false,
  submitted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE scholar_qa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT,
  category TEXT, -- marriage, fiqh, general
  asked_by UUID REFERENCES users(id),
  answered_by UUID REFERENCES users(id), -- Scholar/admin
  status TEXT DEFAULT 'pending', -- pending, answered, rejected
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  answered_at TIMESTAMPTZ
);

-- Islamic etiquette guidelines
CREATE TABLE etiquette_guidelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT, -- chat, profile, general
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User acknowledgment of guidelines
CREATE TABLE user_guideline_acknowledgments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  guideline_id UUID REFERENCES etiquette_guidelines(id) ON DELETE CASCADE NOT NULL,
  acknowledged_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, guideline_id)
);

-- Enhanced reporting
CREATE TABLE violation_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES users(id) NOT NULL,
  reported_user_id UUID REFERENCES users(id),
  report_type TEXT NOT NULL, -- inappropriate_content, harassment, fake_profile, etc.
  context TEXT, -- Where the violation occurred (chat, profile, etc.)
  context_id UUID, -- ID of the chat/message/profile
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
  reviewed_by UUID REFERENCES users(id), -- Admin
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

**Update Existing Tables:**

```sql
-- Add verification requirement to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_required BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS marriage_intention TEXT; -- serious, exploring, not_sure
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'prospective_spouse'; -- prospective_spouse, match, etc.

-- Add chaperone visibility to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS visible_to_chaperones BOOLEAN DEFAULT true;

-- Add quick report flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;
```

#### 1.2 Migration Files

Create migration files in `supabase/migrations/`:
- `create_verification_system.sql`
- `create_compatibility_system.sql`
- `create_chaperone_system.sql`
- `create_community_features.sql`
- `create_guidelines_system.sql`
- `update_users_for_verification.sql`

---

### **Phase 2: Enhanced Onboarding** (Week 2-3)

#### 2.1 New Onboarding Flow

**File Structure:**
```
app/(auth)/onboarding/
  step0-intent.tsx          # NEW: Marriage intentions
  step1-basic.tsx           # Updated: Language changes
  step2-religiosity.tsx     # Enhanced: More deen questions
  step2b-madhhab.tsx        # NEW: Madhhab-specific questions
  step3-lifestyle.tsx       # NEW: Lifestyle compatibility
  step3b-family.tsx         # NEW: Family expectations
  step3c-mahr.tsx           # NEW: Mahr preferences
  step4-hobbies.tsx         # Existing
  step5-photos.tsx          # Enhanced: Verification requirement
  step6-prompts.tsx         # Existing
  step7-location.tsx        # Existing
  step8-background.tsx      # Existing
  step9-guidelines.tsx      # NEW: Islamic etiquette screen
  done.tsx                  # Updated: Welcome to community
```

**Key Changes:**

1. **Step 0: Marriage Intentions** (`step0-intent.tsx`)
   - "What is your intention for using this platform?"
     - Serious marriage search
     - Exploring marriage possibilities
     - Learning about Islamic marriage
   - "How would you describe your search?"
     - Looking for prospective spouse
     - Seeking compatible partner for marriage
   - Language: "prospective spouse" not "date"

2. **Enhanced Religiosity Step**
   - More detailed deen questions:
     - Prayer frequency
     - Quran reading habits
     - Fasting during Ramadan
     - Zakat giving
     - Hajj/Umrah status
   - Religious goals and priorities

3. **New: Madhhab Step** (`step2b-madhhab.tsx`)
   - Which madhhab do you follow?
   - How important is madhhab compatibility?
   - Flexibility on madhhab differences?

4. **New: Lifestyle Compatibility** (`step3-lifestyle.tsx`)
   - Work-life balance expectations
   - Living arrangements (with family, separate, etc.)
   - Financial expectations
   - Social activities preferences
   - Technology/social media usage

5. **New: Family Expectations** (`step3b-family.tsx`)
   - Family involvement in search
   - Living with in-laws expectations
   - Family values alignment
   - Cultural vs. Islamic priorities

6. **New: Mahr Preferences** (`step3c-mahr.tsx`)
   - Mahr expectations (range, type)
   - Flexibility on mahr
   - Mahr payment timeline preferences

7. **Enhanced Photo Step**
   - Mandatory verification notice
   - "All photos will be verified for appropriateness"
   - Clear no-nudity policy
   - ID verification requirement

8. **New: Guidelines Step** (`step9-guidelines.tsx`)
   - Islamic etiquette screen
   - Must acknowledge before proceeding
   - Key points:
     - Respectful communication
     - No inappropriate content
     - Chaperone option available
     - Quick report feature
   - "I understand and agree" checkbox

**Implementation:**

```tsx
// step0-intent.tsx
export default function Step0Intent() {
  const [intention, setIntention] = useState("");
  const [language, setLanguage] = useState("prospective_spouse");
  
  const intentions = [
    { value: "serious", label: "Serious marriage search" },
    { value: "exploring", label: "Exploring marriage possibilities" },
    { value: "learning", label: "Learning about Islamic marriage" }
  ];
  
  // Save to onboarding store
  // Update user language preference
}
```

---

### **Phase 3: Compatibility System** (Week 3-4)

#### 3.1 Compatibility Questions UI

**File:** `app/(main)/profile/compatibility/index.tsx`

**Features:**
- Category-based question flow
- Progress indicator
- Save and continue
- Compatibility preview

**Question Categories:**
1. **Deen** (Religious Practice)
   - Prayer frequency
   - Quran reading
   - Religious education
   - Religious goals

2. **Madhhab** (School of Thought)
   - Which madhhab
   - Importance of compatibility
   - Flexibility

3. **Lifestyle**
   - Work-life balance
   - Social activities
   - Technology usage
   - Hobbies alignment

4. **Family Expectations**
   - Living arrangements
   - Family involvement
   - Cultural priorities

5. **Mahr**
   - Expected range
   - Payment preferences
   - Flexibility

#### 3.2 Compatibility Summary Screen

**File:** `app/(main)/profile/compatibility/summary.tsx`

**Features:**
- Visual compatibility scores per category
- Overall compatibility percentage
- Detailed breakdown
- "What this means" explanations
- Suggestions for improvement

#### 3.3 Compatibility Display in Swipe/Profile

**Integration Points:**
- Show compatibility score on swipe cards
- Detailed view in profile
- Filter by compatibility threshold
- Highlight high compatibility matches

**Implementation:**

```tsx
// components/CompatibilityBadge.tsx
export function CompatibilityBadge({ 
  userId, 
  otherUserId 
}: { 
  userId: string; 
  otherUserId: string;
}) {
  const { data: compatibility } = useCompatibility(userId, otherUserId);
  
  if (!compatibility) return null;
  
  return (
    <View className="bg-[#B8860B]/20 rounded-xl p-3">
      <Text className="text-white font-semibold">
        {compatibility.overall_compatibility}% Compatible
      </Text>
      <View className="mt-2">
        <CompatibilityBar 
          label="Deen" 
          value={compatibility.deen_compatibility} 
        />
        <CompatibilityBar 
          label="Lifestyle" 
          value={compatibility.lifestyle_compatibility} 
        />
        {/* ... */}
      </View>
    </View>
  );
}
```

---

### **Phase 4: Chaperoned Chat** (Week 4-5)

#### 4.1 Chaperone Invitation Flow

**File:** `app/(main)/chat/[chatId]/chaperone.tsx`

**Features:**
- "Invite Chaperone" button in chat
- Search for chaperone (family member, friend)
- Send invitation
- Chaperone accepts/declines
- Notification system

#### 4.2 Chaperone View

**Features:**
- Chaperone sees all messages (if permission granted)
- Can view chat history (if enabled)
- Can leave comments/guidance
- Respectful monitoring

#### 4.3 Chat Reminders

**File:** `app/(main)/chat/[chatId]/reminders.tsx`

**Features:**
- Periodic reminders about respectful behavior
- Islamic etiquette tips
- "Remember: Keep conversations halal and respectful"
- Auto-dismiss after reading

**Implementation:**

```tsx
// In chat screen
useEffect(() => {
  // Show reminder every 10 messages or 30 minutes
  const reminderInterval = setInterval(() => {
    if (shouldShowReminder()) {
      showEtiquetteReminder();
    }
  }, 30 * 60 * 1000); // 30 minutes
  
  return () => clearInterval(reminderInterval);
}, []);
```

---

### **Phase 5: Verification System** (Week 5-6)

#### 5.1 Photo Verification

**File:** `app/(main)/profile/verification/photo.tsx`

**Features:**
- Upload ID document
- Photo verification (AI + manual)
- No-nudity checks
- Verification status display
- Rejection reasons

#### 5.2 ID Verification

**File:** `app/(main)/profile/verification/id.tsx`

**Features:**
- Secure document upload
- Encryption
- Admin review
- Verification badge

#### 5.3 Verification Badge

**Display:**
- Profile header
- Swipe cards
- Chat header
- Trust indicator

**Implementation:**

```tsx
// components/VerificationBadge.tsx
export function VerificationBadge({ 
  userId 
}: { 
  userId: string;
}) {
  const { data: verification } = useVerification(userId);
  
  if (!verification?.photo_verified && !verification?.id_verified) {
    return null;
  }
  
  return (
    <View className="flex-row items-center bg-green-500/20 rounded px-2 py-1">
      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
      <Text className="text-green-400 text-xs ml-1">Verified</Text>
    </View>
  );
}
```

---

### **Phase 6: Quick Report & Block** (Week 6)

#### 6.1 One-Tap Report

**Integration Points:**
- Every profile: Report button
- Every chat: Report in menu
- Every message: Long-press → Report
- Quick report reasons:
  - Inappropriate content
  - Harassment
  - Fake profile
  - Spam
  - Other

**File:** `app/(main)/report/quick.tsx`

**Features:**
- Pre-filled context
- Quick reason selection
- Optional description
- Submit and block option

#### 6.2 Enhanced Block Flow

**File:** `app/(main)/block/index.tsx`

**Features:**
- Block immediately
- Report and block
- Reason selection
- Confirmation

---

### **Phase 7: Community Features** (Week 7-9)

#### 7.1 New Home Screen Structure

**File:** `app/(main)/home/index.tsx` (NEW - replaces swipe as default)

**Tab Structure:**
```
Tabs:
1. Home (Community) - DEFAULT
   - Events feed
   - Discussions
   - Educational content
   - Quick actions
   
2. Meet (Swipe) - Renamed from "Swipe"
   - Prospective spouse matching
   - Swipe interface
   
3. Community
   - Events calendar
   - Discussions
   - Q&A with scholars
   - Business directory
   
4. Chat
   - Existing chat list
   
5. Profile
   - Existing profile
```

#### 7.2 Events Feature

**Files:**
- `app/(main)/community/events/index.tsx` - Events list
- `app/(main)/community/events/[eventId].tsx` - Event details
- `app/(main)/community/events/create.tsx` - Create event (admins)

**Features:**
- Local masjid events
- Classes and workshops
- Community gatherings
- RSVP system
- Location-based discovery

#### 7.3 Discussions Feature

**Files:**
- `app/(main)/community/discussions/index.tsx` - Discussion list
- `app/(main)/community/discussions/[discussionId].tsx` - Discussion thread
- `app/(main)/community/discussions/create.tsx` - Create discussion

**Features:**
- Category-based discussions
- Replies and nested threads
- Upvote/downvote (optional)
- Moderation
- Search

#### 7.4 Q&A with Scholars

**Files:**
- `app/(main)/community/qa/index.tsx` - Q&A list
- `app/(main)/community/qa/[qaId].tsx` - Q&A detail
- `app/(main)/community/qa/ask.tsx` - Ask question

**Features:**
- Submit questions
- Scholar responses
- Categories
- Search archive

#### 7.5 Halal Business Directory

**Files:**
- `app/(main)/community/businesses/index.tsx` - Business list
- `app/(main)/community/businesses/[businessId].tsx` - Business detail
- `app/(main)/community/businesses/submit.tsx` - Submit business

**Features:**
- Category browsing
- Location-based search
- Verification badges
- Reviews (optional)
- Contact information

#### 7.6 Educational Content

**Integration:**
- Link to Marriage Foundations Course
- Articles and resources
- Video content
- Scholar recommendations

---

### **Phase 8: Guidelines & Etiquette** (Week 9-10)

#### 8.1 Guidelines Screen

**File:** `app/(main)/guidelines/index.tsx`

**Features:**
- Category-based guidelines
- Before first chat requirement
- Acknowledgment tracking
- Quick reference

#### 8.2 Pre-Chat Guidelines

**File:** `app/(main)/chat/[chatId]/guidelines.tsx`

**Features:**
- Show before first message
- Must acknowledge
- Quick reference button
- Reminders

#### 8.3 Reminders System

**Implementation:**
- Periodic reminders in chat
- Context-aware tips
- Non-intrusive
- Dismissible

---

### **Phase 9: UI/UX Updates** (Week 10-11)

#### 9.1 Language Changes Throughout App

**Replace:**
- "Date" → "Prospective Spouse"
- "Match" → "Compatible Partner"
- "Dating" → "Marriage Search"
- "Swipe" → "Meet" or "Discover"
- "Like" → "Interested" or "Compatible"

#### 9.2 Visual Updates

- Community-focused imagery
- Islamic design elements
- Professional, respectful aesthetic
- Trust indicators

#### 9.3 Navigation Updates

- Home tab = Community (default)
- Meet tab = Swipe/matching
- Clear separation of features

---

### **Phase 10: Testing & Polish** (Week 11-12)

#### 10.1 Testing Checklist

- [ ] Onboarding flow complete
- [ ] Compatibility system works
- [ ] Chaperone system functional
- [ ] Verification process smooth
- [ ] Reporting works quickly
- [ ] Community features accessible
- [ ] Guidelines enforced
- [ ] Language consistent
- [ ] Performance acceptable
- [ ] App Store guidelines met

#### 10.2 App Store Preparation

- Update app description
- New screenshots (community-focused)
- Keywords update
- Privacy policy updates
- Age rating review

---

## 📊 Database Migration Order

1. Create verification tables
2. Create compatibility tables
3. Create chaperone tables
4. Create community tables
5. Create guidelines tables
6. Update users table
7. Migrate existing data
8. Create indexes
9. Set up RLS policies

---

## 🎨 UI/UX Design Principles

1. **Community First:** Home screen shows community, not matching
2. **Respectful Language:** "Prospective spouse" not "date"
3. **Trust Indicators:** Verification badges prominent
4. **Safety Features:** Quick report always accessible
5. **Islamic Values:** Guidelines and reminders visible
6. **Professional Design:** Clean, modern, respectful

---

## 🚀 Implementation Priority

**Must Have (MVP):**
1. Enhanced onboarding with marriage intentions
2. Language changes throughout app
3. Home screen restructure (community first)
4. Quick report feature
5. Guidelines screen
6. Basic verification

**Should Have:**
1. Compatibility system
2. Chaperone chat
3. Community events
4. Discussions
5. Full verification

**Nice to Have:**
1. Q&A with scholars
2. Business directory
3. Advanced compatibility
4. Educational content hub

---

## 📝 Next Steps

1. **Review this plan** with team
2. **Prioritize features** based on App Store submission timeline
3. **Create detailed designs** for each screen
4. **Set up development branches** for each phase
5. **Begin Phase 1** (Database schema)
6. **Iterate and test** each phase

---

## 🔗 Related Documents

- `MARRIAGE_FOUNDATIONS_IMPLEMENTATION.md` - Course feature
- `APP_STORE_REJECTION_APPEAL.md` - Previous rejection response
- Database schema files in `supabase/migrations/`

---

**Status:** Planning phase - Ready for implementation review and prioritization.


