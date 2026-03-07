import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "./supabase";

// ----------------------------------------------------------------------------
// Foreground behavior:
// In strict UX, DO NOT show push banners/sounds while the app is actively open.
// (Messages should be visible in the UI already.)
// ----------------------------------------------------------------------------
let currentAppState: string = AppState.currentState ?? "active";
AppState.addEventListener("change", (next) => {
  currentAppState = next;
});

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isForeground = currentAppState === "active";
    const type = notification.request.content.data?.type;
    // Always surface gate_approved — user is actively waiting for this
    const alwaysShow = type === "gate_approved";
    return {
      shouldShowAlert: !isForeground || alwaysShow,
      shouldPlaySound: !isForeground || alwaysShow,
      shouldSetBadge: false,
    };
  },
});

function getProjectId(): string | undefined {
  // Works across Expo Go + EAS builds (depending on config)
  // If undefined, Expo Go often still works; dev builds may require it.
  const anyConst: any = Constants;
  return (
    anyConst?.expoConfig?.extra?.eas?.projectId ||
    anyConst?.easConfig?.projectId ||
    anyConst?.expoConfig?.extra?.projectId
  );
}

export async function registerAndSyncPushToken(): Promise<void> {
  // Must be logged in to associate token to user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // iOS/Android permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    // User denied notifications; do nothing
    return;
  }

  // Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#B8860B", // Gold LED color for notifications
    });
  }

  // Expo push token
  let token: string | undefined;
  const projectId = getProjectId();
  if (!projectId) {
    console.warn(
      '[Push] Missing Expo projectId. Add `expo.extra.eas.projectId` to `app.config.js`/`app.json` (or use an EAS dev build). Push token registration skipped.'
    );
    return;
  }

  try {
    const response = await Notifications.getExpoPushTokenAsync({ projectId });
    token = response.data;
  } catch (e) {
    console.warn("[Push] Failed to get Expo push token:", e);
    return;
  }

  if (!token) return;

  // Upsert token row for this user
  const { error } = await supabase
    .from("user_push_tokens")
    .upsert(
      {
        user_id: user.id,
        token,
        platform: Platform.OS,
        device_name: Constants.deviceName ?? null,
        revoked: false,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,token" }
    );

  if (error) {
    console.warn("[Push] Failed to upsert push token:", error);
  } else {
  }
}


