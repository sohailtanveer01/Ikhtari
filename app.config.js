export default {
    expo: {
      name: "Habibi Swipe",
      slug: "habibi-swipe",
      scheme: "habibiswipe",
      orientation: "portrait", // Lock app to portrait mode only
      icon: "./assets/images/icon.png",
      // Custom notification icon (Android only - iOS uses app icon automatically)
      // IMPORTANT: Android notification icons MUST be monochrome (white on transparent)
      notification: {
        icon: "./assets/images/android-icon-monochrome.png",
        color: "#B8860B", // Gold color for notification icon
      },
      extra: {
        eas: {
          projectId: "5401771d-589a-47b5-8e0c-e0850eea1cc3",
        },
      },
      plugins: [
        "expo-router",
        [
          "@react-native-google-signin/google-signin",
          {
            iosUrlScheme: "com.googleusercontent.apps.32648878488-c1epo6b84ibikaknfnu800f103p3j3cu.apps.googleusercontent.com",
          },
        ],
        "expo-apple-authentication",
      ],
      ios: {
        bundleIdentifier: "com.habibiswipe.app",
        icon: "./assets/images/icon.png",
        usesIcloudStorage: true,
        // iOS automatically uses the app icon for push notifications
        // Ensure icon.png is 1024x1024 PNG (currently verified)
        infoPlist: {
          NSPhotoLibraryUsageDescription:
            "Habibi Swipe needs access to your gallery to upload profile photos.",
          NSCameraUsageDescription:
            "Habibi Swipe needs access to your camera to take profile photos.",
          NSMicrophoneUsageDescription:
            "Habibi Swipe needs access to your microphone to send voice messages.",
          "ITSAppUsesNonExemptEncryption": false,
          // Lock iOS to portrait mode only
          UISupportedInterfaceOrientations: [
            "UIInterfaceOrientationPortrait"
          ],
          // iPad can support portrait and upside down, but not landscape
          "UISupportedInterfaceOrientations~ipad": [
            "UIInterfaceOrientationPortrait"
          ],
        },
      },
      android: {
        package: "com.habibiswipe.app",
        screenOrientation: "portrait", // Lock Android to portrait mode only
        permissions: [
          "READ_EXTERNAL_STORAGE",
          "WRITE_EXTERNAL_STORAGE",
          "CAMERA",
        ],
        // Android notification icon configuration
        icon: "./assets/images/icon.png",
        adaptiveIcon: {
          foregroundImage: "./assets/images/icon.png",
          backgroundColor: "#000000", // Black background to match app theme
        },
      },
    },
  };
  