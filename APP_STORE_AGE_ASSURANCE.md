# App Store Age Assurance Response

## For the "Age Assurance" field in App Store Connect:

**Recommended Response (Full):**

```
Declared age range API: Users must provide their date of birth during account registration. The app calculates the user's age from the provided date of birth and enforces a minimum age requirement of 18 years. Age validation is performed using client-side calculation that accounts for year, month, and day differences to ensure accurate age verification. Users under 18 are prevented from creating an account or accessing the service. Age validation is enforced both during initial registration and when users update their profile information.
```

---

## Alternative Shorter Response:

```
Declared age range API: Users provide their date of birth during registration. The app calculates age and enforces a minimum age of 18. Users under 18 cannot create accounts or access the service.
```

---

## If the field allows multiple selections or a dropdown:

Select or mention: **"Declared age range API"** or **"Other means of age assurance"**

Then in the text field, provide:

```
Users must provide their date of birth during account registration. The app calculates the user's age from the provided date of birth and enforces a minimum age requirement of 18 years. Age validation is performed using client-side calculation that accounts for year, month, and day differences to ensure accurate age verification. Users under 18 are prevented from creating an account or accessing the service.
```

---

## What Your App Actually Does:

1. **Date of Birth Collection**: Users must enter their date of birth during onboarding (Step 1)
2. **Age Calculation**: The app calculates the user's actual age from the date of birth (accounting for month and day)
3. **Age Validation**: 
   - Checks if user is at least 18 years old
   - Blocks users under 18 with error message: "You must be at least 18 years old to use this app."
   - Also validates that DOB is not in the future and not unreasonably old (>120 years)
4. **Enforcement Points**:
   - During initial onboarding/registration
   - When editing profile information
   - Users cannot proceed without meeting the age requirement

---

## Important Notes:

- **Declared age range API**: This aligns with Apple's "declared age range API" category - users declare their age via date of birth
- **Client-side validation**: The validation happens in the app before account creation
- **No government ID verification**: The app does not use government-issued ID verification (passport, driver's license, national ID)
- **No age estimation**: The app does not use AI/ML age estimation capabilities
- **Standard for dating apps**: This is the most common approach for dating apps and is generally accepted by Apple
- **Accurate calculation**: The app calculates age accurately by accounting for month and day differences, not just year

---

## If Apple Asks for More Details:

You can provide:

1. **Where it happens**: "Age verification occurs during the onboarding process (Step 1 of 8) where users must enter their date of birth using a native date picker."

2. **How it's enforced**: "The app calculates the user's age from the date of birth and validates that they are at least 18 years old. If validation fails, the user cannot proceed with account creation and receives an error message."

3. **Technical details**: "Age calculation accounts for month and day differences to ensure accurate age verification. The validation also prevents future dates and unreasonably old dates (>120 years)."

---

## Code References:

- **Onboarding validation**: `app/(auth)/onboarding/step1-basic.tsx` (lines 146-161)
- **Profile edit validation**: `app/(main)/profile/edit.tsx` (lines 313-333)
- **Terms of Service**: States "You must be at least 18 years old to use Habibi Swipe"

---

**Note**: This self-declaration method is standard for dating apps and should be acceptable to Apple. If Apple requires stricter verification (like ID verification), you would need to integrate a third-party service, but this is typically not required for dating apps unless there are specific regional requirements.

