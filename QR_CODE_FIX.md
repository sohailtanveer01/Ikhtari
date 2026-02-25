# QR Code Fix - Network/Configuration Issues

## 🔍 The Problem

Your QR code scanning stopped working after a WiFi change. This is typically a **network configuration** or **cache** issue, not a fundamental incompatibility.

---

## ✅ Step-by-Step Fix

### Step 1: Clear All Caches

```bash
# Clear Expo cache
rm -rf .expo
rm -rf node_modules/.cache

# Clear Metro bundler cache
npx expo start --clear
```

### Step 2: Check Your Network

**Make sure your device and computer are on the SAME WiFi network:**

1. **On your Mac:**
   ```bash
   # Check your IP address
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   You should see something like: `192.168.1.136`

2. **On your iPhone/Android:**
   - Go to Settings → WiFi
   - Check the network name matches your Mac's network
   - Note: Some public WiFi (like coffee shops) block device-to-device communication

### Step 3: Check Firewall Settings

**On Mac:**
1. System Settings → Network → Firewall
2. Make sure port 8081 is not blocked
3. If firewall is on, try temporarily disabling it to test

### Step 4: Reset Expo Configuration

```bash
# Reset Expo state
rm -rf ~/.expo/state.json

# Start fresh
npx expo start --dev-client --clear
```

### Step 5: Use Tunnel Mode (Bypasses Network Issues)

If you're still having issues, use tunnel mode which works even on different networks:

```bash
npx expo start --dev-client --tunnel
```

**Note:** Tunnel mode is slower but bypasses all network configuration issues.

---

## 🎯 Most Likely Fixes

### Fix 1: Network Changed (Most Common)

**Problem:** Your Mac and device are on different networks, or the network blocks device-to-device communication.

**Solution:**
1. Make sure both devices are on the **same WiFi network**
2. If on public WiFi, use **tunnel mode**:
   ```bash
   npx expo start --dev-client --tunnel
   ```

### Fix 2: IP Address Changed

**Problem:** Your Mac's IP address changed, but the development build is trying to connect to the old IP.

**Solution:**
1. Start Expo:
   ```bash
   npx expo start --dev-client
   ```
2. Look for the connection URL in terminal (e.g., `exp://192.168.1.136:8081`)
3. In your development build app, manually enter this URL:
   - Shake device → Dev Menu → "Enter URL manually"
   - Enter: `exp://192.168.1.136:8081` (use the IP from terminal)

### Fix 3: Development Build Needs Update

**Problem:** Your development build might be outdated or corrupted.

**Solution:**
1. Rebuild the development build:
   ```bash
   eas build --profile development --platform ios --clear-cache
   ```
2. Install the new build on your device
3. Try connecting again

### Fix 4: Expo Cache Corrupted

**Problem:** Expo's cache got corrupted during the WiFi change.

**Solution:**
```bash
# Clear everything
rm -rf .expo
rm -rf node_modules/.cache
rm -rf ~/.expo

# Restart
npx expo start --dev-client --clear
```

---

## 🚀 Quick Test Commands

### Test 1: Check if Expo Server Starts
```bash
npx expo start --dev-client
```
**Expected:** You should see a QR code and connection URL like `exp://192.168.x.x:8081`

### Test 2: Check Network Connectivity
```bash
# On your device, open a browser and try:
http://192.168.1.136:8081
```
**Expected:** You should see Metro bundler info (or an error page, but connection should work)

### Test 3: Use Tunnel Mode
```bash
npx expo start --dev-client --tunnel
```
**Expected:** Works even if devices are on different networks (slower but reliable)

---

## 📱 Manual Connection (Always Works)

If QR code scanning never works, you can always connect manually:

1. **Start Expo:**
   ```bash
   npx expo start --dev-client
   ```

2. **Note the connection URL** from terminal (e.g., `exp://192.168.1.136:8081`)

3. **On your device:**
   - Open your development build app
   - Shake device (or use gesture) to open Dev Menu
   - Tap "Enter URL manually"
   - Enter: `exp://192.168.1.136:8081` (use your actual IP)

---

## 🔧 Complete Reset (Nuclear Option)

If nothing works, do a complete reset:

```bash
# 1. Clear all caches
rm -rf .expo
rm -rf node_modules/.cache
rm -rf ~/.expo

# 2. Reinstall dependencies
npm install

# 3. Start fresh
npx expo start --dev-client --clear --tunnel
```

---

## 💡 Pro Tips

1. **Always use tunnel mode on public WiFi:**
   ```bash
   npx expo start --dev-client --tunnel
   ```

2. **Bookmark your connection URL** - If your IP changes frequently, manually entering the URL is faster than scanning

3. **Use simulators for development:**
   ```bash
   npx expo run:ios    # iOS Simulator
   npx expo run:android # Android Emulator
   ```
   No QR codes needed!

4. **Check network before starting:**
   - Make sure both devices are on same WiFi
   - Avoid public WiFi that blocks device-to-device communication

---

## 🆘 Still Not Working?

If none of these work, the issue might be:

1. **Development build is corrupted** - Rebuild it
2. **Network firewall is blocking** - Use tunnel mode
3. **Device permissions changed** - Reinstall development build
4. **Expo CLI needs update** - `npm install -g expo-cli@latest`

Try tunnel mode first - it's the most reliable solution for network issues!




