# App Encryption Documentation Guide
## For App Store Submission

**Last Updated:** January 2025

---

## 📝 App Functionality Description (For Form Field)

**Use this description in the "App Functionality and Purpose" field:**

```
Habibi Swipe is a dating and social networking mobile application designed for Muslim users seeking serious relationships. The app allows users to create detailed profiles with photos and personal information, discover and connect with other users through a swipe-based interface, send and receive messages with matched users, send compliments to express interest, and use comprehensive filters (age, location, religiosity, ethnicity, etc.) to find compatible matches. The app includes authentication via email, Google, and Apple Sign-In, secure messaging features, and subscription-based premium features. All user data and communications are transmitted securely over HTTPS/TLS to our backend services.
```

**Shorter version (if character limit is tight):**

```
Habibi Swipe is a Muslim-focused dating and social networking app that enables users to create profiles, discover matches through swiping, communicate with matched users via secure messaging, and use filters to find compatible partners. The app uses standard HTTPS/TLS encryption for all network communication and OAuth authentication flows.
```

---

## ✅ Quick Answer

Your app **ONLY uses standard encryption** (HTTPS/TLS) and is **EXEMPT** from export compliance requirements.

**Answer in App Store Connect:**
- **"Does your app use encryption?"** → **"Yes"**
- **"Does your app use exempt encryption?"** → **"Yes"**
- **"Does your app use non-exempt encryption?"** → **"No"**

**For the specific questions about documentation requirements:**
- **"Encryption algorithms that are proprietary or not accepted as standard"** → **"No"**
- **"Standard encryption algorithms instead of, or in addition to, using or accessing the encryption within Apple's operating system"** → **"No"**

---

## 📋 Detailed Form Filling Guide

### Step 1: Does your app use encryption?

**Answer: YES**

**Reason:** Your app uses HTTPS/TLS for:
- API communication with Supabase
- OAuth authentication (Google, Apple)
- All network requests

---

### Step 2: Does your app use exempt encryption?

**Answer: YES**

**What is exempt encryption?**
- Standard HTTPS/TLS encryption for data transmission
- Encryption provided by the operating system
- Encryption for authentication purposes
- Standard cryptographic libraries

**Your app uses:**
- ✅ HTTPS/TLS for all API calls (Supabase)
- ✅ Standard OAuth flows (Google Sign-In, Apple Sign-In)
- ✅ System-provided encryption (iOS/Android native)
- ✅ Standard cryptographic libraries (no custom encryption)

---

### Step 3: Does your app use non-exempt encryption?

**Answer: NO**

**What is non-exempt encryption?**
- Custom encryption algorithms
- Encryption for purposes other than standard communication
- Proprietary encryption methods
- Encryption for data storage (beyond standard OS encryption)

**Your app does NOT use:**
- ❌ Custom encryption algorithms
- ❌ Proprietary encryption methods
- ❌ Encryption for data storage (beyond standard OS encryption)
- ❌ Encryption for purposes other than standard HTTPS communication

---

## 🔍 Technical Details (For Reference)

### Encryption Used in Your App:

1. **HTTPS/TLS (Standard)**
   - All API calls to Supabase use HTTPS
   - OAuth flows use HTTPS
   - Standard TLS 1.2+ encryption

2. **OAuth Authentication (Standard)**
   - Google Sign-In: Uses standard OAuth 2.0 over HTTPS
   - Apple Sign-In: Uses standard OAuth 2.0 over HTTPS
   - Supabase Authentication: Uses standard JWT tokens over HTTPS

3. **System Encryption (Standard)**
   - iOS Keychain for secure storage (system-provided)
   - Android Keystore for secure storage (system-provided)
   - Standard OS-level encryption

### Libraries That Use Encryption:

- `@supabase/supabase-js` - Uses HTTPS/TLS (standard)
- `@react-native-google-signin/google-signin` - Uses OAuth over HTTPS (standard)
- `expo-apple-authentication` - Uses OAuth over HTTPS (standard)
- `axios` - Uses HTTPS/TLS (standard)
- React Native networking - Uses HTTPS/TLS (standard)

**All of these use standard, exempt encryption.**

---

## ✅ App Configuration Verification

Your `app.config.js` already has the correct setting:

```javascript
ios: {
  infoPlist: {
    "ITSAppUsesNonExemptEncryption": false,  // ✅ Correct!
  }
}
```

This tells Apple that your app **does NOT use non-exempt encryption**.

**This setting is automatically included in your app build** when you build with EAS. You don't need to manually add it to Xcode - Expo/EAS handles this for you.

---

## 📝 App Store Connect Form Answers

### When filling out the Export Compliance form:

1. **"Does your app use encryption?"**
   - ✅ **YES**

2. **"Does your app use exempt encryption?"**
   - ✅ **YES**
   - **Explanation:** "The app uses standard HTTPS/TLS encryption for all network communication, OAuth authentication flows, and standard cryptographic libraries provided by the operating system. No custom encryption algorithms are used."

3. **"Does your app use non-exempt encryption?"**
   - ✅ **NO**

4. **"Does your app use encryption for purposes other than standard communication?"**
   - ✅ **NO**

5. **"Does your app use custom encryption algorithms?"**
   - ✅ **NO**

### For the Documentation Requirements Questions:

6. **"Encryption algorithms that are proprietary or not accepted as standard by international standard bodies (IEEE, IETF, ITU, etc.)?"**
   - ✅ **NO**
   - **Explanation:** The app only uses standard HTTPS/TLS (TLS 1.2+) which is an IETF standard (RFC 5246, RFC 8446). No proprietary algorithms are used.

7. **"Standard encryption algorithms instead of, or in addition to, using or accessing the encryption within Apple's operating system?"**
   - ✅ **NO**
   - **Explanation:** The app uses Apple's built-in networking stack (URLSession, NSURLSession) which provides HTTPS/TLS encryption. The app does not implement its own encryption layer - it relies entirely on Apple's OS-provided encryption for all network communication.

---

## 🚫 What You DON'T Need

Since your app only uses exempt encryption, you **DO NOT need**:

- ❌ Export Compliance Documentation (ERN)
- ❌ Self-Classification Report
- ❌ Commodity Classification Request
- ❌ Any additional paperwork

---

## 📄 Sample Response Text

If App Store Connect asks for a description, use this:

```
This app uses standard HTTPS/TLS encryption for all network communication with our backend services (Supabase). The app also uses standard OAuth 2.0 flows over HTTPS for authentication with Google and Apple. All encryption is provided by standard operating system libraries and follows standard cryptographic protocols. No custom encryption algorithms are implemented. The app uses the standard encryption exemption as it only uses encryption for standard communication purposes.
```

---

## 🔍 Verification Checklist

Before submitting, verify:

- [x] `ITSAppUsesNonExemptEncryption: false` in `app.config.js` ✅
- [x] Only HTTPS/TLS for network communication ✅
- [x] Standard OAuth flows (no custom auth) ✅
- [x] No custom encryption algorithms ✅
- [x] No proprietary encryption methods ✅
- [x] Standard OS-provided encryption only ✅

---

## ⚠️ Important Notes

1. **Standard Encryption is Exempt**
   - Apps that only use standard HTTPS/TLS are automatically exempt
   - No additional documentation needed
   - This is the most common case for mobile apps

2. **Your App Qualifies for Exemption**
   - ✅ Uses standard HTTPS/TLS
   - ✅ Uses standard OAuth
   - ✅ No custom encryption
   - ✅ No proprietary methods

3. **If Apple Asks for More Info**
   - Refer to this document
   - Explain that you only use standard HTTPS/TLS
   - Mention that `ITSAppUsesNonExemptEncryption: false` is set in your config

---

## 📚 Additional Resources

- [Apple Export Compliance Guide](https://developer.apple.com/documentation/security/compiling_against_cryptographic_apis)
- [ITSAppUsesNonExemptEncryption Documentation](https://developer.apple.com/documentation/bundleresources/information_property_list/itsappusesnonexemptencryption)

---

## ✅ Summary

**Your app is EXEMPT from export compliance requirements** because it only uses:
- Standard HTTPS/TLS encryption
- Standard OAuth authentication
- System-provided encryption libraries

**Answer in App Store Connect:**
- Encryption used? → **Yes**
- Exempt encryption? → **Yes**
- Non-exempt encryption? → **No**

**No additional documentation or forms needed!** ✅

