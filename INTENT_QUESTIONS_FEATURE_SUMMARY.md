# Intent Questions Feature - Complete Summary

## 🎯 Overview

The **Intent Questions System** is a comprehensive feature that requires users to set 3-6 questions that others must answer before expressing interest. This ensures meaningful connections and filters out casual users.

---

## ✅ **FULLY IMPLEMENTED**

### Database Schema

1. **`intent_questions` Table**
   ```sql
   - id (UUID)
   - user_id (UUID) - Owner of questions
   - question_text (TEXT) - The question
   - is_from_library (BOOLEAN) - From pre-written library?
   - library_question_id (TEXT) - Reference to library question
   - display_order (INTEGER) - Order for display
   - created_at, updated_at
   ```

2. **`interest_requests` Table**
   - Stores interest requests between users
   - Status: pending, accepted, declined
   - Links sender and recipient

3. **`interest_answers` Table**
   - Stores answers to intent questions
   - Links to interest_request and question
   - Stores answerer_id (who answered)

4. **`users.intent_questions_set` Column**
   - Boolean flag indicating if user has set questions
   - Gates swipe/discover feature

---

## 🎨 UI Components

### 1. **IntentQuestionsSetup Component** (`components/IntentQuestionsSetup.tsx`)

**Features:**
- ✅ Add questions from library (categorized)
- ✅ Write custom questions
- ✅ Reorder questions (up/down arrows)
- ✅ Remove questions
- ✅ Validation (3-6 questions required)
- ✅ Progress indicator (X/6 questions)
- ✅ Category filtering (All, Marriage & Values, Deen & Spirituality, etc.)
- ✅ Shows "Already added" for used library questions
- ✅ Modal interface for library selection

**Question Library:**
- 25+ pre-written questions in 5 categories:
  - Marriage & Values (5 questions)
  - Deen & Spirituality (5 questions)
  - Family & Lifestyle (5 questions)
  - Communication (5 questions)
  - Practical (5 questions)

---

### 2. **Onboarding Step** (`app/(auth)/onboarding/step5-intent-questions.tsx`)

**Features:**
- ✅ Step 5 of 9-step onboarding flow
- ✅ Uses IntentQuestionsSetup component
- ✅ Saves to onboarding store
- ✅ Progress indicator (step 5/9)
- ✅ Navigation to next step (photos)

---

### 3. **Setup Questions Screen** (`app/(main)/swipe/setup-questions.tsx`)

**Features:**
- ✅ Allows users to set/update questions later
- ✅ Accessible from swipe screen if not set
- ✅ Calls `save-intent-questions` edge function
- ✅ Updates `intent_questions_set` flag
- ✅ Navigates back after saving

---

### 4. **Answer Questions Screen** (`app/(main)/swipe/answer-questions.tsx`)

**Features:**
- ✅ Shows when expressing interest
- ✅ Displays recipient's questions
- ✅ Text input for each answer
- ✅ Validation (all must be answered)
- ✅ Character count/limit
- ✅ Submits interest request with answers
- ✅ Calls `submit-interest` edge function
- ✅ Shows success message

---

### 5. **Answer Back Screen** (`app/(main)/likes/answer-back.tsx`)

**Features:**
- ✅ When recipient wants to respond
- ✅ Shows sender's questions
- ✅ Allows answering back before accepting/declining
- ✅ Text input for answers
- ✅ Calls `respond-to-interest` with "answer_back" action
- ✅ Stores answers in `interest_answers` table

---

### 6. **Review Interest Screen** (`app/(main)/likes/review-interest.tsx`)

**Features:**
- ✅ Shows received interest requests
- ✅ Displays sender's answers to your questions
- ✅ Accept/Decline/Answer Back options
- ✅ Shows sender's profile info
- ✅ Calls `respond-to-interest` edge function
- ✅ Creates match if accepted

---

## 🔧 Edge Functions

### 1. **`save-intent-questions`** (`supabase/functions/save-intent-questions/index.ts`)

**Purpose:** Save/update user's intent questions

**Features:**
- ✅ Validates 3-6 questions required
- ✅ Validates question_text not empty
- ✅ Deletes all existing questions for user
- ✅ Inserts new questions
- ✅ Updates `intent_questions_set = true` on users table
- ✅ Returns success with inserted questions

**Validation:**
- Must provide between 3 and 6 questions
- Each question must have non-empty question_text

---

### 2. **`submit-interest`** (`supabase/functions/submit-interest/index.ts`)

**Purpose:** Submit interest request with answers

**Features:**
- ✅ Validates recipient has questions set
- ✅ Validates all questions are answered
- ✅ Validates answers are non-empty
- ✅ Creates interest_request record
- ✅ Stores answers in interest_answers table
- ✅ Sends push notification to recipient
- ✅ Returns interest_request_id

**Flow:**
1. User views profile
2. Clicks "Express Interest"
3. Answers all questions
4. Submits → Creates interest_request (pending)
5. Recipient receives notification

---

### 3. **`respond-to-interest`** (`supabase/functions/respond-to-interest/index.ts`)

**Purpose:** Handle accept/decline/answer_back actions

**Features:**
- ✅ **Accept:** Creates match, sends notification
- ✅ **Decline:** Updates status, sends notification
- ✅ **Answer Back:** Validates answers, stores them
- ✅ Updates interest_request status
- ✅ Handles match creation on accept

**Actions:**
- `accept` - Creates match, both users can chat
- `decline` - Rejects interest, no match
- `answer_back` - Recipient answers sender's questions before deciding

---

## 🔄 Integration Points

### 1. **Swipe Screen Gate** (`app/(main)/swipe/index.tsx`)

**Features:**
- ✅ Checks `intent_questions_set` flag on mount
- ✅ Blocks swipe/discover until questions set
- ✅ Shows setup screen if not set
- ✅ Loading state while checking
- ✅ Loads feed only after questions are set

**Code:**
```tsx
// Gate: user hasn't set intent questions yet
if (intentQuestionsSet === false) {
  return (
    <View>
      <Text>Set Your Intent Questions</Text>
      <Pressable onPress={() => router.push("/(main)/swipe/setup-questions")}>
        <Text>Set Up Questions</Text>
      </Pressable>
    </View>
  );
}
```

---

### 2. **Profile View** (`app/(main)/swipe/profile-view.tsx`)

**Features:**
- ✅ Shows question count
- ✅ "Express Interest" button
- ✅ Navigates to answer-questions screen
- ✅ Checks if interest already sent

---

### 3. **Onboarding Flow** (`app/(auth)/onboarding/done.tsx`)

**Features:**
- ✅ Saves intent questions via edge function
- ✅ Part of final onboarding step
- ✅ Doesn't block flow if save fails

---

### 4. **Onboarding Store** (`lib/onboardingStore.tsx`)

**Features:**
- ✅ Added `intentQuestions` field to OnboardingData type
- ✅ Stores questions during onboarding
- ✅ Persists across onboarding steps

---

## 📊 Data Flow

### Setting Questions:
1. User opens IntentQuestionsSetup
2. Selects 3-6 questions (library or custom)
3. Reorders if needed
4. Saves → `save-intent-questions` edge function
5. Questions stored in `intent_questions` table
6. `intent_questions_set = true` on users table

### Expressing Interest:
1. User views profile
2. Clicks "Express Interest"
3. Navigates to answer-questions screen
4. Answers all recipient's questions
5. Submits → `submit-interest` edge function
6. Creates `interest_request` (pending)
7. Stores answers in `interest_answers` table
8. Recipient receives notification

### Responding to Interest:
1. Recipient sees interest request in likes
2. Opens review-interest screen
3. Views sender's answers
4. Options:
   - **Accept:** Creates match
   - **Decline:** Rejects interest
   - **Answer Back:** Answers sender's questions first

---

## 🎯 Key Features

### ✅ Question Management
- Library of 25+ pre-written questions
- Custom question support
- Question reordering
- Category filtering
- Validation (3-6 questions)

### ✅ Interest System
- Mandatory questions before expressing interest
- Answer validation
- Interest request/response flow
- Answer-back feature
- Status tracking (pending, accepted, declined)

### ✅ User Experience
- Gate prevents swiping without questions
- Clear setup flow
- Easy question management
- Review answers before responding

---

## 📁 File Structure

```
components/
  └── IntentQuestionsSetup.tsx          # Main setup component

app/(auth)/onboarding/
  └── step5-intent-questions.tsx         # Onboarding step

app/(main)/swipe/
  ├── setup-questions.tsx                # Setup screen
  ├── answer-questions.tsx               # Answer when expressing interest
  └── profile-view.tsx                   # Shows question count

app/(main)/likes/
  ├── answer-back.tsx                    # Answer sender's questions
  └── review-interest.tsx                # Review received interest

constants/
  └── intentQuestions.ts                 # Question library

lib/stores/
  └── interestStore.ts                   # Interest system store

supabase/functions/
  ├── save-intent-questions/             # Save questions
  ├── submit-interest/                   # Submit interest
  └── respond-to-interest/               # Accept/decline/answer back

supabase/migrations/
  ├── create_intent_questions_table.sql
  ├── add_intent_questions_set_to_users.sql
  ├── create_interest_requests_table.sql (if exists)
  └── create_interest_answers_table.sql
```

---

## 🔍 Database Tables

### `intent_questions`
- Stores user's questions
- RLS: Anyone can read (for viewing profiles), users manage own

### `interest_requests`
- Stores interest requests
- Links sender and recipient
- Status tracking

### `interest_answers`
- Stores answers to questions
- Links to interest_request and question
- Tracks who answered

---

## 🎨 Question Library Categories

1. **Marriage & Values** (5 questions)
   - "What does a successful Islamic marriage look like to you?"
   - "What are your non-negotiables in a spouse?"
   - "How do you envision the roles of husband and wife?"
   - "What is your timeline for marriage?"
   - "How important is it that your spouse shares your cultural background?"

2. **Deen & Spirituality** (5 questions)
   - "How does Islam shape your daily life?"
   - "What is your relationship with salah and how consistent are you?"
   - "How do you plan to grow spiritually as a couple?"
   - "What Islamic values are most important for you to share with a spouse?"
   - "How do you handle differences in religious practice within a relationship?"

3. **Family & Lifestyle** (5 questions)
   - "Do you want children? If so, how many and when?"
   - "How involved do you expect extended family to be in your marriage?"
   - "Where do you see yourself living in the next 5 years?"
   - "How do you feel about your spouse working after marriage?"
   - "What does your ideal weekend look like as a married couple?"

4. **Communication** (5 questions)
   - "How do you handle conflict or disagreements?"
   - "What is your love language?"
   - "How do you express appreciation and affection?"
   - "What is one thing you wish people understood about you?"
   - "How important is emotional vulnerability to you in a relationship?"

5. **Practical** (5 questions)
   - "How do you approach finances and financial planning?"
   - "What are your career goals and how do they fit with married life?"
   - "How do you prioritize health and fitness?"
   - "What is the biggest lesson you've learned from a past experience?"
   - "What are you most passionate about outside of work?"

---

## 🔄 User Flow

### New User:
1. Completes onboarding steps 1-4
2. **Step 5:** Sets intent questions (3-6)
3. Continues onboarding (photos, prompts, etc.)
4. Questions saved on completion

### Existing User (No Questions):
1. Tries to swipe/discover
2. **Gate:** Blocked until questions set
3. Sees "Set Your Intent Questions" screen
4. Sets questions via setup screen
5. Can now swipe/discover

### Expressing Interest:
1. Views profile
2. Sees "Express Interest" button
3. Clicks → Answer questions screen
4. Answers all recipient's questions
5. Submits → Interest sent (pending)

### Receiving Interest:
1. Receives notification
2. Opens likes/review-interest screen
3. Views sender's answers
4. Options:
   - Accept → Match created
   - Decline → Interest rejected
   - Answer Back → Answer sender's questions first

---

## ✅ Implementation Status

- ✅ Database schema complete
- ✅ Question library created (25+ questions)
- ✅ Setup component built
- ✅ Onboarding integration complete
- ✅ Answer screens built
- ✅ Interest system complete
- ✅ Edge functions implemented
- ✅ Gate system working
- ✅ Store integration complete

---

## 📝 Notes

- Questions are mandatory before swiping
- Minimum 3, maximum 6 questions
- Questions can be from library or custom
- Answers are required when expressing interest
- Answer-back feature allows mutual question answering
- Interest requests can be accepted, declined, or answered back

---

**Status:** ✅ Fully Implemented and Production Ready


