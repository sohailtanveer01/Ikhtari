# App Store Submission Guide

This guide will help you submit your Habibi Swipe app to the App Store. Since your app is already on TestFlight, you're close to releasing it to production.

## Prerequisites Checklist

Before submitting, ensure you have:

- [x] EAS CLI installed (`npm install -g eas-cli`)
- [x] Apple Developer Account with active membership
- [x] App Store Connect access (as Admin or App Manager)
- [x] App already on TestFlight
- [x] Production build configuration in `eas.json`
- [x] Custom domain configured (`api.habibiswipe.com`)
- [x] Privacy Policy and Terms of Service available at `https://habibiswipe.com`
- [x] App icon (1024x1024 PNG) ready
- [x] App configured for production (environment variables set)

## Step 1: Update App Version (if needed)

If you need to increment the version:

```bash
# Check current version in app.json
# Update version if needed in app.json or let EAS auto-increment (already configured)
```

Your `eas.json` already has `autoIncrement: true`, so EAS will handle versioning automatically.

## Step 2: Build Production Version for App Store

Build a production version specifically for App Store submission:

```bash
# Login to EAS (if not already logged in)
eas login

# Build for iOS production
eas build --platform ios --profile production

# This will:
# - Build your app with production environment variables
# - Use your production Supabase URL (api.habibiswipe.com)
# - Create an App Store build (not TestFlight)
# - Upload to App Store Connect automatically
```

**Note:** This build will take 15-30 minutes. You'll get a build ID you can track.

## Step 3: Verify Build in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **My Apps** → **Habibi Swipe**
3. Go to **TestFlight** tab (the build will appear here first)
4. Wait for the build to process (can take 10-60 minutes)
5. Once processed, you'll see it available for submission

## Step 4: Create App Store Listing (First Time Only)

If this is your first App Store submission, you'll need to create the App Store listing:

### 4.1 App Information

- **Name:** Habibi Swipe (max 30 characters)
- **Subtitle:** Find Your Habibi (optional, max 30 characters)
- **Primary Language:** English (or your preferred language)
- **Bundle ID:** com.habibiswipe.app (already set)
- **SKU:** habibi-swipe-001 (unique identifier, your choice)

### 4.2 App Store Information

Navigate to **App Store** tab and fill in:

#### App Preview & Screenshots

Required screenshots:
- **6.5" iPhone (iPhone 14 Pro Max):** 1290 x 2796 pixels
- **5.5" iPhone (iPhone 8 Plus):** 1242 x 2208 pixels

**Tips:**
- Capture screenshots from your app running on a simulator or device
- Show key features: swiping, matches, chat, profile
- Make sure screenshots are high quality and showcase your app well

#### Description

**App Description (up to 4000 characters):**

```
Habibi Swipe - Find Your Perfect Match

Welcome to Habibi Swipe, the premier Muslim dating app designed to help you find your Habibi with respect, tradition, and modern technology.

🌙 Features:
• Swipe through profiles of verified Muslim singles
• Find matches based on shared values, religiosity, and lifestyle preferences
• Chat with your matches in a safe, Halal environment
• Send compliments to stand out and express genuine interest
• Comprehensive filters: Age, Location, Religiosity, Ethnicity, and more
• Privacy-focused design with photo protection and safe chat features

💍 Built for Serious Relationships:
• Detailed profiles showcasing religion, values, and lifestyle
• Halal mode for guided conversations that respect Islamic principles
• Designed with marriage in mind, not casual dating

🔒 Privacy & Safety:
• Photo protection to prevent screenshots
• Report and block users for a safe experience
• Verified profiles to ensure authenticity

🌟 Why Habibi Swipe:
• Community-driven platform built by Muslims, for Muslims
• Respectful environment that honors Islamic values
• Modern, intuitive interface that's easy to use
• Connect with like-minded individuals seeking meaningful relationships

Download Habibi Swipe today and start your journey to finding your Habibi!

Privacy Policy: https://habibiswipe.com/privacy-policy
Terms of Service: https://habibiswipe.com/terms-of-service
Support: https://habibiswipe.com/support
```

**Keywords (up to 100 characters):**
```
Muslim dating, halal dating, Islamic marriage, Muslim singles, matchmaking, dating app, matrimony, nikah
```

**Support URL:** `https://habibiswipe.com/support`
**Marketing URL (optional):** `https://habibiswipe.com`

#### App Privacy

You'll need to answer privacy questions about your app. Based on your app's functionality:

- **User ID:** Yes (for authentication and profiles)
- **Name:** Yes (for user profiles)
- **Email:** Yes (for authentication)
- **Photos or Videos:** Yes (user-uploaded profile photos)
- **Location:** Yes (for location-based matching)
- **User Content:** Yes (messages, profile information)
- **Purchases:** Yes (if you have in-app purchases/subscriptions)

You can reference your Privacy Policy at: `https://habibiswipe.com/privacy-policy`

### 4.3 Pricing and Availability

- **Price:** Free (or set your price)
- **Availability:** Select countries (or All Countries)
- **In-App Purchases:** Configure if you have subscriptions

## Step 5: Submit for Review

Once your build is processed and all information is filled in:

1. Go to **App Store** tab in App Store Connect
2. Click **+ Version or Platform** if creating first version
3. Select the build you want to submit
4. Review all information:
   - [ ] App description complete
   - [ ] Screenshots uploaded
   - [ ] Privacy Policy URL is set
   - [ ] Support URL is set
   - [ ] Contact information is correct
   - [ ] Age rating is appropriate
5. Answer **App Review Information:**
   - **Demo Account:** Provide test account credentials if needed
   - **Notes:** Any special instructions for reviewers
   - **Contact Information:** Your contact details
6. Review **Version Information**
7. Click **Add for Review** or **Submit for Review**

## Step 6: App Review Process

After submission:

1. **In Review:** Apple reviews your app (usually 24-48 hours)
2. **Pending Developer Release:** Approved but waiting for you to release
3. **Ready for Sale:** App is live on the App Store!

**If Rejected:**
- Read the rejection reason carefully
- Fix the issues
- Resubmit with a new build or updated metadata

## Important Notes

### Encryption Compliance

Your app already has `ITSAppUsesNonExemptEncryption: false` in `app.config.js`, which means:
- Standard HTTPS/SSL encryption only
- No custom encryption algorithms
- This typically means **No Export Compliance** form needed

If Apple asks for Export Compliance:
- Answer: "No, this app does not use encryption"
- Or use the Export Compliance form if needed

### TestFlight vs App Store Build

- **TestFlight builds:** For beta testing (internal/external testers)
- **App Store builds:** For public release (what we're building now)

You can submit the same build that's on TestFlight to App Store, or create a new build.

### Version Numbers

- **Build number:** Auto-incremented by EAS (already configured)
- **Version number:** Update in `app.json` if needed for major releases

### Common Issues

1. **Missing Screenshots:** Upload screenshots for all required device sizes
2. **Privacy Policy Missing:** Ensure Privacy Policy is accessible at your URL
3. **App Icon Issues:** Ensure icon is 1024x1024 PNG without transparency
4. **Missing Description:** Complete all required app description fields
5. **Age Rating:** Complete the age rating questionnaire

## Quick Command Reference

```bash
# Login to EAS
eas login

# Build for App Store
eas build --platform ios --profile production

# Check build status
eas build:list

# Submit to App Store (optional, can also do in App Store Connect)
eas submit --platform ios --latest

# Check submission status
eas submit:list
```

## After Approval

Once your app is approved and released:

1. **Monitor Reviews:** Respond to user reviews on App Store
2. **Track Analytics:** Use App Store Connect analytics
3. **Update Regularly:** Keep the app updated with new features and bug fixes
4. **Marketing:** Promote your app through social media, website, etc.

## Support

- **EAS Documentation:** https://docs.expo.dev/build/introduction/
- **App Store Connect Help:** https://help.apple.com/app-store-connect/
- **Apple Developer Support:** https://developer.apple.com/support/

---

**Good luck with your App Store submission! 🚀**

