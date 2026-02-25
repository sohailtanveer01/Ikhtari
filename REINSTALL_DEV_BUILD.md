# Reinstall Development Build on iOS Device

## 🎯 The Problem

You deleted the development build app from your iOS device. Since your app uses `expo-dev-client` (not Expo Go), you need to rebuild and reinstall it.

---

## ✅ Solution: Rebuild Development Build

### Step 1: Build Development Version with EAS

Run this command in your terminal:

```bash
eas build --profile development --platform ios
```

**What happens:**
1. EAS will ask if you want to log in to your Apple account
   - **Answer: Yes** (recommended) - This allows EAS to manage certificates automatically
   - Or: No - You'll need to provide certificates manually

2. The build will be created in the cloud (takes 10-20 minutes)

3. You'll get a download link when it's done

### Step 2: Install on Your Device

**Option A: TestFlight (Recommended)**
1. After the build completes, EAS will provide a TestFlight link
2. Open the link on your iPhone
3. Install via TestFlight
4. The app will appear on your home screen

**Option B: Direct Install**
1. Download the `.ipa` file from the EAS build page
2. Install using:
   - **macOS:** Drag `.ipa` to Finder → Connect iPhone → Drag to device
   - **Windows:** Use 3uTools or similar
   - **Or:** Use EAS's install link (if provided)

### Step 3: Connect to Dev Server

Once the app is installed:

1. **Start the dev server:**
   ```bash
   npx expo start --dev-client
   ```

2. **Connect your device:**
   - **Option 1:** Scan the QR code with your iPhone's Camera app
   - **Option 2:** Manually enter URL:
     - Shake device → Dev Menu → "Enter URL manually"
     - Enter the URL shown in terminal (e.g., `exp://192.168.1.136:8081`)

---

## 🚀 Quick Alternative: Use iOS Simulator

If you have Xcode installed, you can use the simulator (no device needed):

```bash
npx expo run:ios
```

This builds and runs directly in the iOS Simulator - no QR code needed!

---

## 📝 Step-by-Step Commands

### 1. Make sure you're logged in to EAS:
```bash
eas login
```

### 2. Build development version:
```bash
eas build --profile development --platform ios
```

### 3. Wait for build to complete (10-20 minutes)

### 4. Install on device (via TestFlight link or download)

### 5. Start dev server:
```bash
npx expo start --dev-client
```

### 6. Connect device (scan QR or enter URL manually)

---

## 🔧 Troubleshooting

### Build Fails with Apple Account Error

If you get an error about Apple account:

1. **Make sure you're logged in:**
   ```bash
   eas login
   ```

2. **If you don't have an Apple Developer account:**
   - You can use a free Apple ID for development builds
   - EAS will guide you through the process

### Build Takes Too Long

- First build always takes longer (10-20 minutes)
- Subsequent builds are faster (5-10 minutes) due to caching
- You can check build status at: https://expo.dev/accounts/[your-account]/builds

### Can't Install on Device

- Make sure your device is registered in your Apple Developer account
- For TestFlight: Make sure you're added as a tester
- For direct install: Make sure your device UDID is registered

---

## 💡 Pro Tips

1. **Keep the development build installed** - You only need to rebuild when:
   - You add new native dependencies
   - You change native configuration
   - The build gets corrupted

2. **Use tunnel mode if on different networks:**
   ```bash
   npx expo start --dev-client --tunnel
   ```

3. **Bookmark your connection URL** - If your IP changes, manually entering is faster than scanning

---

## 🎯 Summary

1. ✅ Build: `eas build --profile development --platform ios`
2. ✅ Install: Via TestFlight or direct install
3. ✅ Connect: `npx expo start --dev-client` → Scan QR or enter URL

That's it! Once the development build is installed, QR code scanning will work again.




