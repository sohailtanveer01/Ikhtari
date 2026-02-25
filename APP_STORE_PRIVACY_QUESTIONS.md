# App Store Privacy Questions Guide
## For Habibi Swipe

**Last Updated:** January 2025

---

## ❓ Question 1: Do you or your third-party partners collect data from this app?

### ✅ Answer: **Yes, we collect data from this app**

### Why?

Your app collects data through:

1. **Supabase** (Third-party partner)
   - Stores user profiles, photos, messages, swipes, matches
   - Stores authentication data
   - Stores user preferences and settings
   - This is permanent data storage (not just real-time transmission)

2. **RevenueCat** (Third-party partner)
   - Stores subscription status and purchase history
   - This is permanent data storage

3. **Google Sign-In** (Third-party partner)
   - User data from Google is stored in Supabase
   - This is permanent data storage

4. **Apple Sign-In** (Third-party partner)
   - User data from Apple is stored in Supabase
   - This is permanent data storage

**Apple's Definition:** "Collect" refers to transmitting data off the device in a way that allows you and/or your third-party partners to access it for a period longer than necessary to service the transmitted request in real time.

Since your data is stored permanently in Supabase and RevenueCat, this qualifies as "collection."

---

## 📋 After Answering "Yes" - You'll Need to Answer Detailed Questions

After selecting "Yes, we collect data from this app," Apple will ask you to specify:

### 1. **What types of data do you collect?**

You'll need to select from categories. Based on your app, you collect:

- ✅ **Name** (user profiles)
- ✅ **Email Address** (authentication)
- ✅ **User Content** (messages, photos, profile information)
- ✅ **Photos or Videos** (profile photos, chat images)
- ✅ **Location** (approximate location for matching)
- ✅ **Purchase History** (subscriptions via RevenueCat)
- ✅ **Product Interaction** (swipes, matches, profile views)
- ✅ **Device ID** (for push notifications and authentication)
- ✅ **Other User Content** (bio, prompts, preferences)

### 2. **How is the data used?**

- ✅ **App Functionality** (core app features)
- ✅ **Analytics** (usage patterns, app improvement)
- ✅ **Product Personalization** (matching algorithm, recommendations)
- ✅ **Advertising or Marketing** (if you do any marketing)
- ✅ **Other Purposes** (safety, security, fraud prevention)

### 3. **Is the data linked to the user's identity?**

- ✅ **Yes** - Most data is linked to user accounts

### 4. **Is the data used to track the user?**

- ⚠️ **This depends on your definition:**
  - If "tracking" means cross-app/website tracking for advertising: **No**
  - If "tracking" means linking data to a user's device/account: **Yes** (for app functionality)

**Recommendation:** Answer based on Apple's definition. If you're not doing cross-app tracking for advertising, you can answer **"No"** for tracking purposes.

### 5. **Third-party data sharing**

You'll need to specify which third parties receive data:

- ✅ **Supabase** - Receives all user data (profiles, messages, photos, etc.)
- ✅ **RevenueCat** - Receives subscription/purchase data
- ✅ **Google** - Receives authentication data (if user signs in with Google)
- ✅ **Apple** - Receives authentication data (if user signs in with Apple)
- ✅ **Push Notification Services** (Expo/Apple/Google) - Receives device tokens

---

## 📝 Quick Reference Checklist

When filling out the privacy questions, make sure to include:

### Data Types Collected:
- [x] Name
- [x] Email Address
- [x] User Content (messages, bio, prompts)
- [x] Photos or Videos
- [x] Location (approximate)
- [x] Purchase History
- [x] Product Interaction
- [x] Device ID
- [x] Other User Content (preferences, religious info, etc.)

### Data Uses:
- [x] App Functionality
- [x] Analytics
- [x] Product Personalization
- [x] Other Purposes (safety, security)

### Third-Party Partners:
- [x] Supabase (database, storage, authentication)
- [x] RevenueCat (subscriptions)
- [x] Google (authentication - if used)
- [x] Apple (authentication - if used)
- [x] Push Notification Services

---

## ⚠️ Important Notes

1. **Be Accurate:** Only select data types and uses that actually apply to your app
2. **Third-Party Responsibility:** You're responsible for representing what your third-party partners (Supabase, RevenueCat) collect
3. **Update When Needed:** If you add new features or third-party services, update your privacy responses
4. **Match Your Privacy Policy:** Your answers should align with your Privacy Policy document

---

## 🔗 Related Documents

- **Privacy Policy:** `PRIVACY_POLICY.md`
- **Terms of Service:** `TERMS_OF_SERVICE.md`
- **App Store Submission Guide:** `APP_STORE_SUBMISSION.md`

---

## 💡 Tips

1. **Start with "Yes"** - Since you store data in Supabase, you definitely collect data
2. **Be Comprehensive** - Don't miss any data types you collect
3. **Be Honest** - Only select what actually applies
4. **Review Regularly** - Update if you add new features or services
5. **Document Everything** - Keep track of what you selected for future reference

---

## ✅ Final Answer

**Question:** Do you or your third-party partners collect data from this app?

**Answer:** **Yes, we collect data from this app**

Then proceed to answer the detailed questions about:
- What data types
- How data is used
- Whether data is linked to identity
- Whether data is used for tracking
- Which third parties receive data








