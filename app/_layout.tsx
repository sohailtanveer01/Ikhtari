import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";
import { LikesNotificationProvider } from "../lib/likesNotificationContext";
import { registerAndSyncPushToken } from "../lib/pushNotifications";
import { supabase } from "../lib/supabase";

// RevenueCat configuration

// Configure QueryClient with optimized cache settings
const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data is fresh for 5 min
      gcTime: 1000 * 60 * 30, // 30 minutes - cache persists for 30 min (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1, // Only retry once on failure
    },
  },
});

export default function RootLayout() {
  const router = useRouter();

  // Lock screen orientation to portrait whenever app is focused
  useFocusEffect(
    useCallback(() => {
      // Lock to portrait mode on every screen focus
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }, [])
  );

  useEffect(() => {
    // Register push token after app mounts AND after login.
    // (This can run before auth is ready, so also listen for auth changes.)
    registerAndSyncPushToken();
    // Also lock orientation on initial mount
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) registerAndSyncPushToken();
    });

    // Navigate on notification tap
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data: any = response?.notification?.request?.content?.data;
      if (data?.type === "chat_message" && data?.chatId) {
        router.push(`/(main)/chat/${data.chatId}`);
      } else if (data?.type === "new_like") {
        // Navigate to likes screen when tapping on a like notification
        router.push("/(main)/likes");
      }
    });

    // // Configure RevenueCat
    // if (Platform.OS === 'ios' || Platform.OS === 'android') {
    //   Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    // }

    return () => {
      sub.remove();
      authSub?.subscription?.unsubscribe();
    };
  }, [router]);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <QueryClientProvider client={qc}>
          <LikesNotificationProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                // Keep gestures enabled but prevent back navigation to auth
              }}
            >
              <Stack.Screen
                name="(auth)"
                options={{
                  // Allow gestures on auth screen
                  gestureEnabled: true,
                }}
              />
              <Stack.Screen
                name="(main)"
                options={{
                  // Disable swipe back gesture on main tabs to prevent going back to auth
                  gestureEnabled: false,
                  // Prevent going back to auth when authenticated
                }}
              />
            </Stack>
          </LikesNotificationProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
