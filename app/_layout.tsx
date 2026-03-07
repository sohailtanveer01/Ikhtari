import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";
import AppSplashScreen from "../components/AppSplashScreen";
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
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  const [fontsLoaded] = useFonts({
    "GreatVibes-Regular": require("../assets/fonts/GreatVibes-Regular.ttf"),
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    // Keep splash for at least 2.8s after fonts load, then fade out
    const timer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setShowSplash(false));
    }, 2800);
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

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
      } else if (data?.type === "new_like" || data?.type === "new_interest") {
        // Navigate to interests/likes screen when tapping on an interest notification
        router.push("/(main)/likes");
      } else if (data?.type === "interest_accepted" && data?.matchId) {
        // Navigate to chat when interest is accepted
        router.push(`/(main)/chat/${data.matchId}`);
      } else if (data?.type === "answer_back" && data?.matchId) {
        // Navigate to chat when someone answers back
        router.push(`/(main)/chat/${data.matchId}`);
      } else if (data?.type === "gate_approved" && data?.matchId) {
        // Navigate to chat when intent answers are approved
        router.push(`/(main)/chat/${data.matchId}`);
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
        <StatusBar style="dark" />
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

        {/* Splash screen — shown until fonts load + 2.8s delay */}
        {showSplash && (
          <Animated.View
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: splashOpacity }}
            pointerEvents="none"
          >
            <AppSplashScreen />
          </Animated.View>
        )}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
