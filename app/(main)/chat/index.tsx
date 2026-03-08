import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { RectButton, Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DiamondIcon from "../../../components/DiamondIcon";
import { supabase } from "../../../lib/supabase";
import { isUserActive } from "../../../lib/useActiveStatus";

// Clean photo URLs
function cleanPhotoUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  if (url.includes("localhost")) {
    const supabasePart = url.split(":http://localhost")[0];
    if (supabasePart && supabasePart.startsWith("http")) return supabasePart;
    return null;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return null;
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ChatListScreen() {
  const [unmatchesNotificationCount, setUnmatchesNotificationCount] = useState(0);
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const { data: chatListData, isLoading, error, refetch } = useQuery({
    queryKey: ["chat-list"],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("get-chat-list");
      if (error) throw error;
      if (data && data.matches) return data.matches;
      return [];
    },
    staleTime: 1000 * 60 * 1,
    gcTime: 1000 * 60 * 15,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const matches = chatListData || [];

  // Matches where current user is the acceptor and answers have been submitted for review.
  // Uses matches.answers_submitted_at (set by submit-chat-gate-answers edge function)
  // so this query only touches the matches table — no RLS issues with match_intent_answers.
  const { data: gateReviewMatchIds } = useQuery({
    queryKey: ["gate-review-pending"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as string[];

      const { data: pendingMatches } = await supabase
        .from("matches")
        .select("id")
        .or(`user1.eq.${user.id},user2.eq.${user.id}`)
        .neq("initiated_by", user.id)
        .is("gate_approved_at", null)
        .not("answers_submitted_at", "is", null);

      return (pendingMatches || []).map((m: any) => m.id) as string[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const { data: unmatchesCount } = useQuery({
    queryKey: ["unmatches-notification-count"],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return 0;

      const { data: unmatches, error: unmatchesError } = await supabase
        .from("unmatches")
        .select("id, rematch_status, unmatched_by, rematch_requested_by")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (unmatchesError) console.error("Error fetching unmatches count:", unmatchesError);

      // Count items that need the user's attention:
      // 1. Someone else unmatched me with no rematch activity yet
      // 2. Someone sent me a rematch request that I haven't responded to
      const actionableUnmatches = unmatches?.filter((u) => {
        if (u.rematch_status === "accepted") return false;
        if (!u.rematch_status && u.unmatched_by !== user.id) return true;
        if (u.rematch_status === "pending" && u.rematch_requested_by !== user.id) return true;
        return false;
      }) || [];

      const { data: declinedCompliments, error: complimentsError } = await supabase
        .from("compliments")
        .select("id")
        .eq("sender_id", user.id)
        .eq("status", "declined");

      if (complimentsError)
        console.error("Error fetching declined compliments count:", complimentsError);

      return actionableUnmatches.length + (declinedCompliments?.length || 0);
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (unmatchesCount !== undefined) setUnmatchesNotificationCount(unmatchesCount);
  }, [unmatchesCount]);

  useEffect(() => {
    let channel: any = null;
    let userId: string | null = null;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
      if (!userId) return;

      channel = supabase
        .channel("chat-list-updates")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "matches" }, () => {
          queryClient.invalidateQueries({ queryKey: ["chat-list"] });
        })
        // DELETE on matches is the definitive signal that an unmatch completed.
        // This fires AFTER the match row is gone, so the refetch correctly omits it.
        // Covers both the unmatching user (belt-and-suspenders) and the other user.
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "matches" }, () => {
          queryClient.invalidateQueries({ queryKey: ["chat-list"] });
        })
        // matches UPDATE covers two signals:
        // 1. answers_submitted_at set → acceptor's review-pending badge appears
        // 2. gate_approved_at set → both users' chat lists unlock in real-time
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, (payload) => {
          if (payload.new?.answers_submitted_at && !payload.old?.answers_submitted_at) {
            queryClient.invalidateQueries({ queryKey: ["gate-review-pending"] });
          }
          if (payload.new?.gate_approved_at && !payload.old?.gate_approved_at) {
            queryClient.invalidateQueries({ queryKey: ["chat-list"] });
            queryClient.invalidateQueries({ queryKey: ["gate-review-pending"] });
          }
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "unmatches" }, (payload) => {
          if (payload.new.unmatched_by !== userId) {
            // Also update the unmatches screen and badge — the chat-list drop
            // is handled by the matches DELETE subscription above.
            queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
            queryClient.invalidateQueries({ queryKey: ["unmatches"] });
          }
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "unmatches" }, (payload) => {
          if (payload.new.user1_id === userId || payload.new.user2_id === userId) {
            if (payload.new.rematch_status === "accepted") {
              // Rematch accepted: new match was created — refresh chat list + unmatches
              queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
              queryClient.invalidateQueries({ queryKey: ["unmatches"] });
              queryClient.invalidateQueries({ queryKey: ["chat-list"] });
            } else if (payload.old?.rematch_status !== payload.new.rematch_status) {
              // Any other status change (pending, rejected): only refresh unmatches screen + badge
              queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
              queryClient.invalidateQueries({ queryKey: ["unmatches"] });
            }
          }
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "compliments" }, (payload) => {
          if (userId && payload.new.sender_id === userId && payload.new.status === "declined") {
            queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
          }
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
          queryClient.invalidateQueries({ queryKey: ["chat-list"] });
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
          if (payload.new.read === true && payload.old?.read === false) {
            queryClient.invalidateQueries({ queryKey: ["chat-list"] });
          }
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "users" }, (payload) => {
          if (payload.new.last_active_at !== payload.old?.last_active_at) {
            queryClient.invalidateQueries({ queryKey: ["chat-list"] });
          }
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "compliments" }, () => {
          queryClient.invalidateQueries({ queryKey: ["chat-list"] });
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "compliments" }, () => {
          queryClient.invalidateQueries({ queryKey: ["chat-list"] });
        })
        .subscribe();
    };

    setupSubscription();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["chat-list"] });
      queryClient.invalidateQueries({ queryKey: ["gate-review-pending"] });
    }, [queryClient])
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FDFAF5", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FDFAF5", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <Text style={{ color: "#EF4444", textAlign: "center", marginBottom: 16 }}>
          Error loading chats: {(error as Error).message}
        </Text>
        <Pressable
          onPress={() => refetch()}
          style={{ borderRadius: 999, overflow: "hidden" }}
        >
          <LinearGradient
            colors={["#E8B820", "#C9980A", "#A87A08"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}>
      <LinearGradient
        colors={["#FFF2B8", "#FDF8EE", "#FDFAF5"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.52 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 16,
        }}
      >
        {/* Wordmark */}
        <Text style={{ fontFamily: "GreatVibes-Regular", fontSize: 42, color: "#1C1208", textShadowColor: "#1C1208", textShadowOffset: { width: 0.4, height: 0.4 }, textShadowRadius: 0.5 }}>
          Ikhtiar
        </Text>

        {/* Unmatches button */}
        <Pressable
          onPress={() => router.push("/(main)/chat/unmatches")}
          style={{ position: "relative" }}
        >
          <View
            style={{
              borderRadius: 999,
              overflow: "hidden",
              borderWidth: 1.5,
              borderColor: "rgba(184,134,11,0.35)",
            }}
          >
            <BlurView
              intensity={Platform.OS === "ios" ? 30 : 0}
              tint="light"
              style={{
                paddingHorizontal: 18,
                paddingVertical: 9,
                backgroundColor:
                  Platform.OS === "android" ? "rgba(253,243,220,0.95)" : "rgba(253,243,220,0.55)",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Text style={{ color: "#B8860B", fontSize: 13.5, fontWeight: "700" }}>Unmatches</Text>
            </BlurView>
          </View>
          {unmatchesNotificationCount > 0 && (
            <View
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                minWidth: 18,
                height: 18,
                backgroundColor: "#EF4444",
                borderRadius: 9,
                borderWidth: 1.5,
                borderColor: "#FDFAF5",
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 4,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>
                {unmatchesNotificationCount > 9 ? "9+" : unmatchesNotificationCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: "rgba(184,134,11,0.1)", marginHorizontal: 20, marginBottom: 8 }} />

      {/* Content */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {matches.length === 0 ? (
          <EmptyState router={router} />
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(m) => m.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingTop: 8 }}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={() => refetch()}
                tintColor="#B8860B"
              />
            }
            renderItem={({ item }) => (
              <ChatItem
                item={item}
                router={router}
                queryClient={queryClient}
                hasGateReview={!item.isCompliment && (gateReviewMatchIds?.includes(item.id) ?? false)}
              />
            )}
          />
        )}
      </View>
    </View>
  );
}

function EmptyState({ router }: { router: any }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
      <Image
        source={require('../../../assets/Logos/transparent-logo.png')}
        style={{ width: 280, height: 140, marginBottom: 20 }}
        resizeMode="contain"
      />

      <Text
        style={{
          color: "#1C1208",
          fontSize: 20,
          fontWeight: "800",
          textAlign: "center",
          marginBottom: 8,
          letterSpacing: -0.3,
        }}
      >
        No conversations yet
      </Text>
      <Text
        style={{
          color: "#9E8E7E",
          fontSize: 14,
          textAlign: "center",
          lineHeight: 21,
          marginBottom: 28,
        }}
      >
        Start discovering profiles and make a match to begin chatting
      </Text>

      {/* Divider */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28, width: "80%" }}>
        <View style={{ flex: 1, height: 1, backgroundColor: "rgba(184,134,11,0.18)" }} />
        <Text style={{ color: "rgba(184,134,11,0.5)", fontSize: 12 }}>✦</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: "rgba(184,134,11,0.18)" }} />
      </View>

      <Pressable
        onPress={() => router.push("/(main)/swipe")}
        style={({ pressed }) => ({
          borderRadius: 999,
          overflow: "hidden",
          transform: [{ scale: pressed ? 0.97 : 1 }],
          shadowColor: "#B8860B",
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        })}
      >
        <LinearGradient
          colors={["#E8B820", "#C9980A", "#A87A08"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 36, paddingVertical: 15, borderRadius: 999 }}
        >
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: 0.2 }}>
            Discover Profiles
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function ChatItem({ item, router, queryClient, hasGateReview }: { item: any; router: any; queryClient: any; hasGateReview?: boolean }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const rowHeightAnim = useRef(new Animated.Value(0)).current;
  const rowOpacity = useRef(new Animated.Value(1)).current;
  const rowTranslateX = useRef(new Animated.Value(0)).current;
  const measuredHeight = useRef(0);
  const [isCollapsing, setIsCollapsing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const mainPhoto =
    item.otherUser?.photos && item.otherUser.photos.length > 0
      ? cleanPhotoUrl(item.otherUser.photos[0])
      : null;

  const fullName =
    item.otherUser?.first_name && item.otherUser?.last_name
      ? `${item.otherUser.first_name} ${item.otherUser.last_name}`
      : item.otherUser?.name || "Unknown";

  const unreadCount = typeof item.unreadCount === "number" ? item.unreadCount : 0;
  const hasUnread = unreadCount > 0;
  const isOtherUserActive = isUserActive(item.otherUser?.last_active_at);
  const isLastMessageFromOtherUser =
    item.lastMessage && currentUserId && item.lastMessage.sender_id !== currentUserId;

  const swipeableRef = useRef<Swipeable>(null);

  const animateOutAndInvalidate = () => {
    // Pin height to measured value so collapse animation has a defined start
    rowHeightAnim.setValue(measuredHeight.current);
    setIsCollapsing(true);

    // Step 1: slide left + fade out (native driver — smooth 60fps)
    Animated.parallel([
      Animated.timing(rowTranslateX, { toValue: -420, duration: 260, useNativeDriver: true }),
      Animated.timing(rowOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      // Step 2: collapse height to zero (JS driver required for layout props)
      Animated.timing(rowHeightAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: false,
      }).start(() => {
        queryClient.invalidateQueries({ queryKey: ["chat-list"] });
        queryClient.invalidateQueries({ queryKey: ["unmatches"] });
        queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
      });
    });
  };

  const handleUnmatch = async () => {
    swipeableRef.current?.close();
    Alert.alert(
      "Unmatch",
      `Are you sure you want to unmatch with ${fullName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unmatch",
          style: "destructive",
          onPress: async () => {
            // Fire animation immediately — don't wait for API
            animateOutAndInvalidate();
            try {
              await supabase.functions.invoke("unmatch", {
                body: { matchId: item.id },
              });
            } catch (err: any) {
              console.error("Unmatch invoke error:", err);
            }
          },
        },
      ]
    );
  };

  const handleBlock = () => {
    swipeableRef.current?.close();
    if (item.otherUser?.id) {
      router.push({
        pathname: "/(main)/chat/report-block",
        params: { userId: item.otherUser.id, userName: fullName, matchId: item.id },
      });
    }
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [1, 0.8],
      extrapolate: "clamp",
    });
    const opacity = dragX.interpolate({
      inputRange: [-160, -80, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={{
          flexDirection: "row",
          width: 160,
          marginBottom: 10,
          marginLeft: 8,
          gap: 8,
          opacity,
        }}
      >
        <RectButton
          onPress={handleUnmatch}
          style={{
            flex: 1,
            backgroundColor: "#B8860B",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 16,
          }}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>Unmatch</Text>
          </Animated.View>
        </RectButton>
        <RectButton
          onPress={handleBlock}
          style={{
            flex: 1,
            backgroundColor: "#EF4444",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 16,
          }}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>Report</Text>
          </Animated.View>
        </RectButton>
      </Animated.View>
    );
  };

  // Sub-text for the chat item
  let subText: React.ReactElement;
  let subTextColor = hasUnread ? "#1C1208" : "#9E8E7E";
  let subTextWeight: "400" | "500" | "600" = hasUnread ? "600" : "400";
  let subTextItalic = false;

  if (hasGateReview) {
    subText = (
      <Text style={{ fontSize: 13, color: "#B8860B", fontWeight: "600" }} numberOfLines={1}>
        Tap to review their answers
      </Text>
    );
  } else if (item.isCompliment) {
    subTextItalic = false;
    subText = (
      <Text
        style={{ fontSize: 13, color: subTextColor, fontWeight: subTextWeight }}
        numberOfLines={1}
      >
        {item.isComplimentSender
          ? item.complimentStatus === "declined"
            ? "Compliment declined"
            : "You sent a compliment"
          : `${fullName} sent you a compliment`}
      </Text>
    );
  } else if (item.isRematchAccepted) {
    subText = (
      <Text style={{ fontSize: 13, color: "#B8860B", fontStyle: "italic" }} numberOfLines={1}>
        Your rematch request was accepted
      </Text>
    );
  } else if (item.lastMessage) {
    const msgText = item.lastMessage.image_url
      ? currentUserId && isLastMessageFromOtherUser
        ? `${fullName} sent an image`
        : "You sent an image"
      : item.lastMessage.content || item.lastMessage.message;
    subText = (
      <Text
        style={{ fontSize: 13, color: subTextColor, fontWeight: subTextWeight }}
        numberOfLines={1}
      >
        {msgText}
      </Text>
    );
  } else {
    subText = (
      <Text style={{ fontSize: 13, color: "#B8860B", fontStyle: "italic" }} numberOfLines={1}>
        New match! Say salam 👋
      </Text>
    );
  }

  const chatItemContent = (
    <Pressable
      onPress={() => router.push(`/(main)/chat/${item.id}`)}
      style={({ pressed }) => ({
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: "#B8860B",
        shadowColor: "#000",
        shadowOpacity: 0.07,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        overflow: "hidden",
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {/* Inner row — explicit View so flexDirection is always applied */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        {/* Avatar */}
        <View style={{ position: "relative", marginRight: 14, flexShrink: 0 }}>
          {mainPhoto ? (
            <Image
              source={{ uri: mainPhoto }}
              style={{ width: 62, height: 62, borderRadius: 31 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: 62,
                height: 62,
                borderRadius: 31,
                backgroundColor: "#F5F0E8",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 26 }}>👤</Text>
            </View>
          )}

          {/* Online dot */}
          {isOtherUserActive && (
            <View
              style={{
                position: "absolute",
                bottom: 1,
                right: 1,
                width: 14,
                height: 14,
                backgroundColor: "#22C55E",
                borderRadius: 7,
                borderWidth: 2,
                borderColor: "#FFFFFF",
              }}
            />
          )}
        </View>

        {/* Content — name beside avatar, message below name */}
        <View style={{ flex: 1 }}>
          {/* Row 1: Name + Timestamp */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: hasUnread ? "700" : "600",
                color: "#1C1208",
                flex: 1,
              }}
              numberOfLines={1}
            >
              {fullName}
            </Text>
            {item.isCompliment && (
              <View style={{ backgroundColor: "rgba(168,85,247,0.12)", borderRadius: 999, padding: 3, marginRight: 6 }}>
                <DiamondIcon size={11} color="#9333EA" style={{}} />
              </View>
            )}
            <Text style={{ color: "#B0A090", fontSize: 12 }}>
              {item.lastMessage ? formatTimestamp(item.lastMessage.created_at) : ""}
            </Text>
          </View>

          {/* Row 2: Message preview + badges */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>{subText}</View>
            {hasGateReview && !hasUnread && (
              <View
                style={{
                  backgroundColor: "#B8860B",
                  borderRadius: 999,
                  width: 22,
                  height: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 10,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800", lineHeight: 16 }}>!</Text>
              </View>
            )}
            {hasUnread && (
              <View
                style={{
                  backgroundColor: "#B8860B",
                  borderRadius: 999,
                  minWidth: 22,
                  height: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 6,
                  marginLeft: 10,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );

  if (item.isCompliment) return chatItemContent;

  return (
    // Outer view: JS-driven height collapse (useNativeDriver: false)
    <Animated.View
      style={isCollapsing ? { height: rowHeightAnim, overflow: "hidden" } : undefined}
    >
      {/* Inner view: native-driven slide + fade (useNativeDriver: true) */}
      <Animated.View
        onLayout={(e) => { measuredHeight.current = e.nativeEvent.layout.height; }}
        style={{
          opacity: rowOpacity,
          transform: [{ translateX: rowTranslateX }],
        }}
      >
        <Swipeable
          ref={swipeableRef}
          renderRightActions={renderRightActions}
          rightThreshold={40}
          overshootRight={false}
          friction={1.5}
        >
          {chatItemContent}
        </Swipeable>
      </Animated.View>
    </Animated.View>
  );
}
