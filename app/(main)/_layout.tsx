import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { Tabs, useGlobalSearchParams, usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBadgeStore, useNewInterests, useTotalBadgeCount } from "../../lib/stores/badgeStore";
import { useMainPhoto, useUserStore } from "../../lib/stores/userStore";
import { supabase } from "../../lib/supabase";
import { useActiveStatus } from "../../lib/useActiveStatus";

const { width: SCREEN_WIDTH } = Dimensions.get("window");


export default function MainLayout() {
  // Zustand stores
  const profilePhoto = useMainPhoto();
  const totalUnreadCount = useTotalBadgeCount();
  const newInterestsCount = useNewInterests();
  const loadProfile = useUserStore((s) => s.loadProfile);
  const loadAllCounts = useBadgeStore((s) => s.loadAllCounts);
  const setNewInterests = useBadgeStore((s) => s.setNewInterests);

  const pathname = usePathname();
  const searchParams = useGlobalSearchParams();
  const insets = useSafeAreaInsets();

  // Track user's active status (updates last_active_at periodically)
  useActiveStatus();

  // Check if we're on a chat detail screen or filters screen or sub-screens
  const isChatDetail = pathname?.includes("/chat/") && pathname !== "/chat";
  const isFiltersScreen = pathname?.includes("/swipe/filters");
  const isSubScreen = pathname?.includes("/swipe/profile-view") ||
    pathname?.includes("/swipe/answer-questions") ||
    pathname?.includes("/swipe/setup-questions") ||
    pathname?.includes("/likes/review-interest") ||
    pathname?.includes("/likes/answer-back") ||
    pathname === "/matches" ||
    (pathname?.includes("/events/") && pathname !== "/events");

  // Check if viewing from interests section
  const isViewingFromInterests = pathname?.includes("/likes/") && pathname !== "/likes";

  // Hide tab bar on chat detail, filters, or sub-screens
  const hideTabBar = isChatDetail || isFiltersScreen || isSubScreen;

  // Load profile on mount (uses Zustand store)
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Refresh profile when navigating (backup for catching updates)
  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Check for unread messages and pending compliments (uses Zustand store)
  useEffect(() => {
    loadAllCounts();

    // Subscribe to new messages, message updates, and compliments
    const channel = supabase
      .channel("unread-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          useBadgeStore.getState().loadUnreadMessages();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          useBadgeStore.getState().loadUnreadMessages();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "compliments" },
        () => {
          useBadgeStore.getState().loadUnreadMessages();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "compliments" },
        () => {
          useBadgeStore.getState().loadUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAllCounts]);

  // Check for new interests (pending interest requests received)
  const checkNewInterestsRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const checkNewInterests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from("interest_requests")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("status", "pending");

      if (!error) {
        setNewInterests(count || 0);
      }
    };

    checkNewInterestsRef.current = checkNewInterests;
    checkNewInterests();

    // Subscribe to interest_requests table changes
    let channel: any = null;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const newChannel = supabase
        .channel("new-interests")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "interest_requests",
          },
          (payload) => {
            if (payload.new.recipient_id === user.id) {
              if (checkNewInterestsRef.current) {
                checkNewInterestsRef.current();
              }
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "interest_requests",
          },
          (payload) => {
            if (payload.new.recipient_id === user.id || payload.new.sender_id === user.id) {
              if (checkNewInterestsRef.current) {
                checkNewInterestsRef.current();
              }
            }
          }
        )
        .subscribe();

      return newChannel;
    };

    setupSubscription().then((ch) => {
      if (ch) channel = ch;
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [setNewInterests]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#B8860B",
        tabBarInactiveTintColor: "#9E8E7E",
        tabBarStyle: hideTabBar ? { display: "none" } : {
          position: "absolute",
          bottom: Math.max(insets.bottom, 10) + 8,
          left: 0,
          right: 0,
          marginHorizontal: SCREEN_WIDTH * 0.05,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          borderWidth: 1.5,
          borderColor: "#B8860B",
          height: 75,
          borderRadius: 35,
          paddingTop: 8,
          paddingBottom: 8,
          paddingHorizontal: 8,
          ...Platform.select({
            ios: {
              shadowColor: "#B8860B",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.28,
              shadowRadius: 20,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={72}
              tint="light"
              style={[StyleSheet.absoluteFill, { borderRadius: 33.5, overflow: "hidden" }]}
            >
              <View style={styles.tabBarBackground} />
            </BlurView>
          ) : (
            <View style={[styles.tabBarBackground, { borderRadius: 33.5, overflow: "hidden" }]} />
          ),
        tabBarItemStyle: {
          paddingTop: 4,
          paddingBottom: 4,
          borderRadius: 20,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="swipe/index"
        options={{
          title: "Discover",
          tabBarLabel: "",
          tabBarIcon: ({ color, focused }) => {
            const isActive = !isViewingFromInterests && focused;
            return (
              <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                <MaterialCommunityIcons name={isActive ? "view-grid" : "view-grid-outline"} size={36} color={isActive ? "#B8860B" : "#9CA3AF"} />
              </View>
            );
          },
        }}
      />
      <Tabs.Screen
        name="likes/index"
        options={{
          title: "Interests",
          tabBarLabel: "",
          tabBarIcon: ({ color, focused }) => {
            const isActive = isViewingFromInterests || focused;
            return (
              <View style={[styles.iconContainer, isActive && styles.activeIconContainer, { position: "relative" }]}>
                <Ionicons
                  name={isActive ? "heart" : "heart-outline"}
                  size={36}
                  color={isActive ? "#B8860B" : "#9CA3AF"}
                />
                {newInterestsCount > 0 && (
                  <View style={styles.likesCountBadge}>
                    <Text style={styles.likesCountText}>
                      {newInterestsCount > 99 ? "99+" : newInterestsCount}
                    </Text>
                  </View>
                )}
              </View>
            );
          },
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: "Chats",
          tabBarLabel: "",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer, { position: "relative" }]}>
              <Ionicons
                name={focused ? "paper-plane" : "paper-plane-outline"}
                size={32}
                color={focused ? "#B8860B" : "#9CA3AF"}
              />
              {totalUnreadCount > 0 && (
                <View style={styles.likesCountBadge}>
                  <Text style={styles.likesCountText}>
                    {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="events/index"
        options={{
          title: "Events",
          tabBarLabel: "",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons
                name={focused ? "location" : "location-outline"}
                size={32}
                color={focused ? "#B8860B" : "#9CA3AF"}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarLabel: "",
          tabBarIcon: ({ size, focused }) => {
            if (profilePhoto) {
              return (
                <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                  <Image
                    source={{ uri: profilePhoto }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 17,
                    }}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                </View>
              );
            }
            return (
              <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 17,
                    backgroundColor: "#9CA3AF",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 18, color: "#FFFFFF" }}>👤</Text>
                </View>
              </View>
            );
          },
        }}
      />
      {/* Hidden routes - swipe sub-screens */}
      <Tabs.Screen name="swipe/profile-view" options={{ href: null }} />
      <Tabs.Screen name="swipe/answer-questions" options={{ href: null }} />
      <Tabs.Screen name="swipe/setup-questions" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters/index" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters/location" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters/age" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters/height" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters/ethnicity" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters/marital-status" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters/children" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters/religiosity" options={{ href: null }} />
      {/* Hidden routes - likes sub-screens */}
      <Tabs.Screen name="likes/review-interest" options={{ href: null }} />
      <Tabs.Screen name="likes/answer-back" options={{ href: null }} />
      {/* Hidden routes - chat */}
      <Tabs.Screen name="chat/[chatId]" options={{ href: null }} />
      <Tabs.Screen name="chat/unmatches" options={{ href: null }} />
      <Tabs.Screen name="chat/user-profile" options={{ href: null }} />
      <Tabs.Screen name="chat/report-block" options={{ href: null }} />
      {/* Hidden routes - profile */}
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="profile/preview" options={{ href: null }} />
      <Tabs.Screen name="profile/subscription" options={{ href: null }} />
      <Tabs.Screen name="profile/settings" options={{ href: null }} />
      <Tabs.Screen name="profile/account-info" options={{ href: null }} />
      <Tabs.Screen name="profile/notifications" options={{ href: null }} />
      <Tabs.Screen name="profile/marriage-foundations" options={{ href: null }} />
      <Tabs.Screen name="profile/marriage-foundations/index" options={{ href: null }} />
      <Tabs.Screen name="profile/marriage-foundations/[moduleId]" options={{ href: null }} />
      <Tabs.Screen name="profile/marriage-foundations/[moduleId]/quiz" options={{ href: null }} />
      <Tabs.Screen name="profile/marriage-foundations/certified" options={{ href: null }} />
      <Tabs.Screen name="profile/marriage-foundations/expectations" options={{ href: null }} />
      {/* Hidden routes - wali/chaperone */}
      <Tabs.Screen name="profile/wali-setup" options={{ href: null }} />
      <Tabs.Screen name="profile/chaperone-dashboard" options={{ href: null }} />
      <Tabs.Screen name="profile/chaperone-chat" options={{ href: null }} />
      {/* Hidden routes - events */}
      <Tabs.Screen name="events/[eventId]" options={{ href: null }} />
      {/* Hidden routes - misc */}
      <Tabs.Screen name="matches" options={{ href: null }} />
      <Tabs.Screen name="paywall" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(253, 250, 245, 0.58)",
    borderRadius: 33.5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  activeIconContainer: {
    borderWidth: 2,
    borderColor: "#B8860B",
  },
  notificationBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  likesCountBadge: {
    position: "absolute",
    top: -8,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  likesCountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
});
