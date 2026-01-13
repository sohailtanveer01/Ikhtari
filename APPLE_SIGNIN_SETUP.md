# Apple Sign-In Setup Guide

This guide will help you configure Apple Sign-In for your Habibi Swipe app.

## Prerequisites

- ✅ Apple Developer Account
- ✅ App already configured in App Store Connect
- ✅ Bundle ID: `com.habibiswipe.app`
- ✅ Supabase project with Apple provider enabled

## Step 1: Configure Apple Sign-In in Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select **Identifiers** → Your App ID (`com.habibiswipe.app`)
4. Enable **Sign In with Apple** capability
5. Click **Configure** next to "Sign In with Apple"
6. Select **Primary App ID** (your main app)
7. Add **Website URLs**:
   - **Domains**: `habibiswipe.com` (or your Supabase domain)
   - **Return URLs**: 
     - `https://api.habibiswipe.com/auth/v1/callback` (if using custom domain)
     - OR `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback`
8. Save the configuration

## Step 2: Create Service ID (if needed)

1. In Apple Developer Portal, go to **Identifiers** → **Services IDs**
2. Click **+** to create a new Service ID
3. Enter a description (e.g., "Habibi Swipe Web Authentication")
4. Enable **Sign In with Apple**
5. Click **Configure** and select your Primary App ID
6. Add **Website URLs**:
   - **Domains**: `habibiswipe.com` (or your Supabase domain)
   - **Return URLs**: 
     - `https://api.habibiswipe.com/auth/v1/callback` (if using custom domain)
     - OR `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback`
7. Save and note the **Service ID** (you'll need this for Supabase)

## Step 3: Configure Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Apple** and click to configure
5. Enable the Apple provider
6. Enter your **Service ID** (from Step 2)
7. Enter your **Team ID** (found in Apple Developer Portal → Membership)
8. Enter your **Key ID** (create a new key in Apple Developer Portal if needed)
9. Upload your **Private Key** (download from Apple Developer Portal)
10. Save the configuration

### Getting Your Team ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Click on your name in the top right
3. Your **Team ID** is displayed (format: `XXXXXXXXXX`)

### Creating a Key for Sign In with Apple

1. Go to **Certificates, Identifiers & Profiles** → **Keys**
2. Click **+** to create a new key
3. Name it (e.g., "Habibi Swipe Apple Sign-In Key")
4. Enable **Sign In with Apple**
5. Click **Configure** and select your Primary App ID
6. Click **Save**
7. **Download the key file** (`.p8` file) - you can only download it once!
8. Note the **Key ID** (shown after creation)
9. Upload the `.p8` file content to Supabase

## Step 4: Update App Configuration

The app is already configured with:
- ✅ `expo-apple-authentication` package installed (for future native implementation if needed)
- ✅ Plugin added to `app.config.js`
- ✅ Apple Sign-In button added to home screen (iOS only)
- ✅ Using OAuth flow (same as Google) to avoid bundle identifier issues in development

## Step 5: Test Apple Sign-In

1. Build and run the app on **iOS Simulator** or **real iOS device** (OAuth flow works in simulator)
2. Tap **"Continue with Apple"** button
3. A browser window will open for Apple Sign-In (OAuth flow)
4. Complete the Apple authentication flow
5. Verify the user is created in Supabase
6. Check that onboarding flow works correctly

## Important Notes

### iOS Only
- Apple Sign-In is **only available on iOS devices**
- The button will **not appear on Android** (handled automatically)
- Apple Sign-In **works in iOS Simulator** when using OAuth flow (browser-based)

### OAuth Flow Implementation
- The app uses **OAuth flow** (same as Google Sign-In) instead of native Apple Authentication
- This avoids bundle identifier issues in development (`host.exp.Exponent` vs `com.habibiswipe.app`)
- The user will see an Apple Sign-In web page in the browser
- This works consistently across development and production builds

### Email Handling
- Apple may provide a **private relay email** (e.g., `xxxxx@privaterelay.appleid.com`)
- Supabase will handle this automatically
- Users can still receive emails through Supabase's email service

### Name Handling
- Apple only provides name on **first sign-in**
- If name is not provided, the app will prompt during onboarding
- Store the name in your `users` table during onboarding

### Privacy
- Apple Sign-In is more privacy-focused than Google
- Users can choose to hide their email
- The app respects Apple's privacy guidelines

## Troubleshooting

### "Unacceptable audience in id_token: [host.exp.Exponent]"
- This error occurs when using native Apple Authentication with `signInWithIdToken`
- **Solution**: The app now uses **OAuth flow** (same as Google) instead of native authentication
- This avoids bundle identifier mismatches in development (`host.exp.Exponent` vs `com.habibiswipe.app`)
- If you still see this error, ensure you're using the latest version of the app with OAuth flow

### "Sign in with Apple is not available on this device"
- Make sure you're testing on **iOS** (simulator or real device)
- Check that the device is signed in to an Apple ID
- Verify iOS version is 13.0 or later

### "Failed to sign in with Apple"
- Check Supabase configuration (Service ID, Team ID, Key ID, Private Key)
- Verify the redirect URLs match in both Apple Developer Portal and Supabase
- Ensure `habibiswipe://auth/callback` is added to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs
- Check Supabase logs for detailed error messages

### "No identity token received from Apple"
- This error is no longer relevant since we use OAuth flow
- If the user cancels the sign-in, the app handles this gracefully (no error shown)

### Configuration Errors
- Ensure all URLs match exactly between Apple Developer Portal and Supabase
- Check that your bundle ID matches in both places
- Verify the Service ID is correctly entered in Supabase

## Production Checklist

Before submitting to App Store:

- [ ] Apple Sign-In enabled in Apple Developer Portal
- [ ] Service ID created and configured
- [ ] Key created and uploaded to Supabase
- [ ] Supabase Apple provider configured
- [ ] Tested on real iOS device
- [ ] Verified user creation in Supabase
- [ ] Verified onboarding flow works
- [ ] Tested with private relay email
- [ ] Tested with hidden email option

## Resources

- [Expo Apple Authentication Docs](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Supabase Apple Provider Docs](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)

---

**Note**: With OAuth flow, Apple Sign-In works in iOS Simulator as well as real devices, since it uses a browser-based flow.

