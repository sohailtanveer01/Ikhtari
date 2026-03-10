export default {
    expo: {
      name: "Ikhtiar",
      slug: "habibi-swipe",
      scheme: "ikhtiar",
      orientation: "portrait",
      icon: "./assets/Logos/transparent-logo.png",
      notification: {
        icon: "./assets/images/android-icon-monochrome.png",
        color: "#B8860B",
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
        icon: "./assets/Logos/transparent-logo.png",
        usesIcloudStorage: true,
        infoPlist: {
          NSPhotoLibraryUsageDescription:
            "Ikhtiar needs access to your gallery to upload profile photos.",
          NSCameraUsageDescription:
            "Ikhtiar needs access to your camera to take profile photos.",
          NSMicrophoneUsageDescription:
            "Ikhtiar needs access to your microphone to send voice messages.",
          NSLocationWhenInUseUsageDescription:
            "Ikhtiar needs your location to show events near you.",
          "ITSAppUsesNonExemptEncryption": false,
          UISupportedInterfaceOrientations: [
            "UIInterfaceOrientationPortrait"
          ],
          "UISupportedInterfaceOrientations~ipad": [
            "UIInterfaceOrientationPortrait"
          ],
        },
      },
      android: {
        package: "com.habibiswipe.app",
        screenOrientation: "portrait",
        permissions: [
          "READ_EXTERNAL_STORAGE",
          "WRITE_EXTERNAL_STORAGE",
          "CAMERA",
          "android.permission.ACCESS_FINE_LOCATION",
        ],
        icon: "./assets/Logos/bigger-logo.png",
        adaptiveIcon: {
          foregroundImage: "./assets/Logos/bigger-logo.png",
          backgroundColor: "#000000",
        },
      },
    },
  };
  