import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, FlatList, Image, Platform, Pressable, RefreshControl, Text, View } from "react-native";
import { RectButton, Swipeable } from "react-native-gesture-handler";
import DiamondIcon from "../../../components/DiamondIcon";
import Logo from "../../../components/Logo";
import { supabase } from "../../../lib/supabase";
import { isUserActive } from "../../../lib/useActiveStatus";

// Clean photo URLs
function cleanPhotoUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  if (url.includes('localhost')) {
    const supabasePart = url.split(':http://localhost')[0];
    if (supabasePart && supabasePart.startsWith('http')) return supabasePart;
    return null;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return null;
}

export default function ChatListScreen() {
  const [unmatchesNotificationCount, setUnmatchesNotificationCount] = useState(0);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch chat list with React Query (cached)
  const { data: chatListData, isLoading, error, refetch } = useQuery({
    queryKey: ["chat-list"],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("get-chat-list");

      if (error) throw error;

      if (data && data.matches) {

        return data.matches;
      }
      return [];
    },
    staleTime: 1000 * 60 * 1, // 1 minute - cache is fresh for 1 min
    gcTime: 1000 * 60 * 15, // 15 minutes - cache persists for 15 min
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false,
  });

  const matches = chatListData || [];

  // Fetch unmatches notification count (unmatches where user was unmatched + declined compliments)
  const { data: unmatchesCount } = useQuery({
    queryKey: ["unmatches-notification-count"],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return 0;

      // Count unmatches where user was unmatched (not the one who initiated)
      // Exclude pending and accepted rematches (pending shows in chat list, accepted means rematched)
      const { data: unmatches, error: unmatchesError } = await supabase
        .from("unmatches")
        .select("id, rematch_status")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .neq("unmatched_by", user.id); // User was unmatched by someone else

      // Filter out pending and accepted rematches in code
      const filteredUnmatches = unmatches?.filter(
        (unmatch) => unmatch.rematch_status !== 'pending' && unmatch.rematch_status !== 'accepted'
      ) || [];

      if (unmatchesError) {
        console.error("Error fetching unmatches count:", unmatchesError);
      }

      // Count declined compliments where user was the sender
      const { data: declinedCompliments, error: complimentsError } = await supabase
        .from("compliments")
        .select("id")
        .eq("sender_id", user.id)
        .eq("status", "declined");

      if (complimentsError) {
        console.error("Error fetching declined compliments count:", complimentsError);
      }

      const unmatchesCount = filteredUnmatches.length;
      const declinedCount = declinedCompliments?.length || 0;
      
      return unmatchesCount + declinedCount;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - cache is fresh for 5 min
  });

  useEffect(() => {
    if (unmatchesCount !== undefined) {
      setUnmatchesNotificationCount(unmatchesCount);
    }
  }, [unmatchesCount]);

  // Real-time subscription for matches, messages, user activity, unmatches, and declined compliments
  useEffect(() => {
    let channel: any = null;
    let userId: string | null = null;

    const setupSubscription = async () => {
      // Get user ID first
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
      
      if (!userId) return;

      channel = supabase
        .channel("chat-list-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches" },
        () => {
          // Invalidate cache to refetch chat list
          queryClient.invalidateQueries({ queryKey: ["chat-list"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "unmatches" },
        (payload) => {
          // Check if this unmatch affects the current user and they weren't the one who unmatched
          if (payload.new.unmatched_by !== userId) {
            // User was unmatched by someone else - update notification count
            queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
            queryClient.invalidateQueries({ queryKey: ["unmatches"] });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "unmatches",
        },
        (payload) => {
          
          // Check if this unmatch affects the current user
          if (payload.new.user1_id === userId || payload.new.user2_id === userId) {
            // Check if rematch status changed to accepted
            if (payload.new.rematch_status === "accepted") {
              // Rematch was accepted - remove from unmatches and update notification count
              queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
              queryClient.invalidateQueries({ queryKey: ["unmatches"] });
              queryClient.invalidateQueries({ queryKey: ["chat-list"] }); // Refresh chat list
            } else if (payload.new.rematch_status === "rejected" && payload.old?.rematch_status !== "rejected") {
              // Rematch was rejected - refresh chat list to show rejection message
              queryClient.invalidateQueries({ queryKey: ["chat-list"] });
            } else if (payload.old?.rematch_status !== payload.new.rematch_status) {
              // Any other rematch status change - update notification count
              queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "compliments",
        },
        (payload) => {
          // Check if a compliment was declined and the current user was the sender
          if (userId && payload.new.sender_id === userId && payload.new.status === "declined") {
            // User's compliment was declined - update notification count
            queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          // Invalidate cache to refetch chat list (for last message updates)
          queryClient.invalidateQueries({ queryKey: ["chat-list"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages"
        },
        (payload) => {
          // When messages are updated (especially when marked as read), refresh the list
          // Check if read status changed from false to true
          if (payload.new.read === true && payload.old?.read === false) {
            queryClient.invalidateQueries({ queryKey: ["chat-list"] });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
        },
        (payload) => {
          // When a matched user's last_active_at is updated, refresh the chat list
          // to update active status indicators
          if (payload.new.last_active_at !== payload.old?.last_active_at) {
            queryClient.invalidateQueries({ queryKey: ["chat-list"] });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "compliments"
        },
        (payload) => {
          // Invalidate cache when a new compliment is inserted
          // RLS will ensure only relevant compliments are shown
          queryClient.invalidateQueries({ queryKey: ["chat-list"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "compliments"
        },
        (payload) => {
          // Invalidate cache when compliment status changes (accepted/declined)
          // This will refresh the list to remove accepted compliments and show match instead
          queryClient.invalidateQueries({ queryKey: ["chat-list"] });
        }
      )
      .subscribe((status) => {
      });
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  // Refresh when screen comes into focus (e.g., when returning from chat detail)
  useFocusEffect(
    useCallback(() => {
      // Refetch chat list when screen comes into focus
      queryClient.invalidateQueries({ queryKey: ["chat-list"] });
    }, [queryClient])
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#FDFAF5] items-center justify-center">
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-[#FDFAF5] items-center justify-center px-4">
        <Text className="text-red-500 text-center mb-4">
          Error loading chats: {error.message}
        </Text>
        <Pressable
          className="bg-[#B8860B] px-6 py-3 rounded-full"
          onPress={() => refetch()}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FDFAF5] pt-12">
      <View className="px-4 mb-4 flex-row items-center justify-between">
        <Text className="text-[#1C1208] text-2xl font-bold">Chats</Text>
        <View style={{ position: 'relative' }}>
          <Pressable
            onPress={() => router.push("/(main)/chat/unmatches")}
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(184,134,11,0.35)',
            }}
          >
            <BlurView
              intensity={Platform.OS === "ios" ? 28 : 0}
              tint="light"
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: Platform.OS === "android" ? "rgba(253,243,220,0.95)" : "rgba(253,243,220,0.6)",
              }}
            >
              <Text style={{ color: '#B8860B', fontSize: 14, fontWeight: '600' }}>Unmatches</Text>
            </BlurView>
          </Pressable>
          {unmatchesNotificationCount > 0 && (
            <View style={{ position: 'absolute', top: -4, right: -4, width: 12, height: 12, backgroundColor: '#EF4444', borderRadius: 6, borderWidth: 1.5, borderColor: 'white' }} />
          )}
        </View>
      </View>

  

      <View className="flex-1 px-4">

        {matches.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <View className="mb-6">
              <Logo variant="colored" width={120} height={120} style="" />
            </View>
            <Text className="text-[#6B5D4F] text-base">No matches yet</Text>
            <Text className="text-[#9E8E7E] text-sm mt-2 mb-6">Start discovering to find your match! 💕</Text>
            <Pressable
              className="bg-[#B8860B] px-4 py-4 rounded-2xl items-center justify-center"
              onPress={() => router.push("/(main)/swipe")}
            >
              <Text className="text-white font-semibold text-lg">Continue Swiping</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(m) => m.id}
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
              />
            )}
          />
        )}
      </View>
    </View>
  );
}

function ChatItem({ item, router, queryClient }: { item: any; router: any; queryClient: any }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    fetchCurrentUser();
  }, []);

  const mainPhoto = item.otherUser?.photos && item.otherUser.photos.length > 0
    ? cleanPhotoUrl(item.otherUser.photos[0])
    : null;
  const fullName = item.otherUser?.first_name && item.otherUser?.last_name
    ? `${item.otherUser.first_name} ${item.otherUser.last_name}`
    : item.otherUser?.name || "Unknown";

  const unreadCount = typeof item.unreadCount === 'number' ? item.unreadCount : 0;
  const hasUnread = unreadCount > 0;
  const otherUserLastActive = item.otherUser?.last_active_at;
  const isOtherUserActive = isUserActive(otherUserLastActive);

  // Check if last message was sent by current user or other user
  const isLastMessageFromOtherUser = item.lastMessage && currentUserId && item.lastMessage.sender_id !== currentUserId;

  const swipeableRef = useRef<Swipeable>(null);

  const handleUnmatch = async () => {
    swipeableRef.current?.close();
    Alert.alert(
      "Unmatch User",
      `Are you sure you want to unmatch with ${fullName}? You won't be able to message them anymore.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unmatch",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.functions.invoke("unmatch", {
                body: { matchId: item.id },
              });
              if (error) throw error;
              queryClient.invalidateQueries({ queryKey: ["chat-list"] });
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to unmatch.");
            }
          }
        }
      ]
    );
  };

  const handleBlock = () => {
    swipeableRef.current?.close();
    // Navigate to report & block screen
    if (item.otherUser?.id) {
      router.push({
        pathname: "/(main)/chat/report-block",
        params: {
          userId: item.otherUser.id,
          userName: fullName,
          matchId: item.id,
        },
      });
    }
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = dragX.interpolate({
      inputRange: [-160, -80, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={{
          flexDirection: 'row',
          width: 160,
          marginBottom: 12,
          opacity,
        }}
      >
        <RectButton
          onPress={handleUnmatch}
          style={{
            flex: 1,
            backgroundColor: '#B8860B',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 12,
            marginRight: 8,
          }}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Unmatch</Text>
          </Animated.View>
        </RectButton>
        <RectButton
          onPress={handleBlock}
          style={{
            flex: 1,
            backgroundColor: '#EF4444',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 12,
          }}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Report & Block</Text>
          </Animated.View>
        </RectButton>
      </Animated.View>
    );
  };

  // Render the chat item content
  const chatItemContent = (
    <Pressable
      className="bg-white p-4 rounded-2xl mb-3 flex-row items-center border border-[#EDE5D5]"
      onPress={() => router.push(`/(main)/chat/${item.id}`)}
    >
      <View className="relative mr-4">
        {mainPhoto ? (
          <Image
            source={{ uri: mainPhoto }}
            className="w-16 h-16 rounded-full border-2 border-[#B8860B]"
            resizeMode="cover"
          />
        ) : (
          <View className="w-16 h-16 rounded-full bg-[#F5F0E8] items-center justify-center border-2 border-[#B8860B]">
            <Text className="text-[#9E8E7E] text-2xl">👤</Text>
          </View>
        )}
        {isOtherUserActive && (
          <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            className={`text-lg ${hasUnread ? 'font-bold' : 'font-semibold'} text-[#1C1208]`}
            numberOfLines={1}
          >
            {fullName}
          </Text>
          {item.isCompliment && (
            <View className="bg-purple-500 rounded-full px-2 py-0.5">
              <DiamondIcon size={16} color="#FF0000" style={{}} />
            </View>
          )}
          {hasUnread && (
            <View className="bg-[#B8860B] rounded-full px-2 py-0.5 min-w-[20px] items-center justify-center">
              <Text className="text-white text-xs font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
        {item.isCompliment ? (
          <Text
            className={`text-sm mt-1 ${hasUnread ? 'text-[#1C1208] font-medium' : 'text-[#6B5D4F]'}`}
            numberOfLines={1}
          >
            {item.isComplimentSender
              ? (item.complimentStatus === 'declined'
                ? 'Compliment declined'
                : 'You sent a compliment')
              : `${fullName} sent you a compliment`}
          </Text>
        ) : item.hasPendingRematchRequest ? (
          <Text className="text-[#B8860B] text-sm mt-1 italic">
            {fullName} requested a rematch
          </Text>
        ) : item.isRematchRejected ? (
          <Text className="text-red-400 text-sm mt-1 italic">
            Your rematch request has been rejected
          </Text>
        ) : item.isRematchAccepted ? (
          <Text className="text-[#B8860B] text-sm mt-1 italic">
            Your rematch request has been accepted
          </Text>
        ) : item.lastMessage ? (
          <Text
            className={`text-sm mt-1 ${hasUnread ? 'text-[#1C1208] font-medium' : 'text-[#6B5D4F]'}`}
            numberOfLines={1}
          >
            {item.lastMessage.image_url
              ? (currentUserId && isLastMessageFromOtherUser
                  ? `${fullName} sent you an image`
                  : currentUserId
                    ? "You sent an image"
                    : "Image")
              : item.lastMessage.content || item.lastMessage.message}
          </Text>
        ) : (
          <Text className="text-[#B8860B] text-sm mt-1 italic">
            New match! Say salam 👋
          </Text>
        )}
      </View>
      <View className="items-end">
        {item.lastMessage && (
          <Text className="text-[#9E8E7E] text-xs mb-1">
            {new Date(item.lastMessage.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        )}
      </View>
    </Pressable>
  );

  // Only enable swipe actions for actual matches, not compliments
  if (item.isCompliment) {
    return chatItemContent;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      friction={1.5}
    >
      {chatItemContent}
    </Swipeable>
  );
}
