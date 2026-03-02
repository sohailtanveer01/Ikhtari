import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, Text, View } from "react-native";
import Logo from "../../../components/Logo";
import { supabase } from "../../../lib/supabase";

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

export default function UnmatchesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Refresh notification count when user views this screen
  useEffect(() => {
    // Invalidate the notification count query to refresh it
    queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
  }, [queryClient]);

  // Real-time subscription for unmatches updates
  useEffect(() => {
    let channel: any = null;
    let userId: string | null = null;

    const setupSubscription = async () => {
      // Get user ID first
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
      
      if (!userId) return;

      channel = supabase
        .channel("unmatches-updates")
        .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "unmatches",
        },
        (payload) => {
          
          // Check if this unmatch affects the current user
          if (userId && (payload.new.user1_id === userId || payload.new.user2_id === userId)) {
            // If rematch status changed to accepted, remove from list
            if (payload.new.rematch_status === "accepted") {
              queryClient.invalidateQueries({ queryKey: ["unmatches"] });
              queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
            } else if (payload.old?.rematch_status !== payload.new.rematch_status) {
              // Any rematch status change - refresh the list
              queryClient.invalidateQueries({ queryKey: ["unmatches"] });
              queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "unmatches" },
        (payload) => {
          // Check if this unmatch affects the current user
          if (userId && (payload.new.user1_id === userId || payload.new.user2_id === userId)) {
            queryClient.invalidateQueries({ queryKey: ["unmatches"] });
            queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
          }
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

  // Fetch unmatches with React Query
  const { data: unmatchesData, isLoading, error, refetch } = useQuery({
    queryKey: ["unmatches"],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("get-unmatches");

      if (error) throw error;
      
      return data?.users || [];
    },
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  const unmatches = unmatchesData || [];

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
          Error loading unmatches: {error.message}
        </Text>
        <Pressable 
          className="bg-[#B8860B] px-6 py-3 rounded-full"
          onPress={() => refetch()}
        >
          <Text className="text-[#1C1208] font-semibold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FDFAF5] pt-12">
      {/* Header */}
      <View className="px-4 mb-4 flex-row items-center">
        <Pressable 
          onPress={() => router.back()} 
          className="mr-3"
        >
          <Ionicons name="arrow-back" size={24} color="#1C1208" />
        </Pressable>
        <Text className="text-[#1C1208] text-2xl font-bold">Unmatches</Text>
      </View>

      <View className="flex-1 px-4">
        {unmatches.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <View className="mb-6">
              <Logo variant="transparent" width={120} />
            </View>
            <Text className="text-[#9E8E7E] text-base">No unmatches yet</Text>
            <Text className="text-[#9E8E7E] text-sm mt-2">All your connections are active</Text>
          </View>
        ) : (
          <FlatList
            data={unmatches}
            keyExtractor={(item) => `${item.userId}-${item.type}`}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={() => refetch()}
                tintColor="#B8860B"
              />
            }
            renderItem={({ item }) => {
              const mainPhoto = item.user?.photos && item.user.photos.length > 0
                ? cleanPhotoUrl(item.user.photos[0])
                : null;
              const fullName = item.user?.first_name && item.user?.last_name
                ? `${item.user.first_name} ${item.user.last_name}`
                : item.user?.name || "Unknown";
              
              const isBlocked = item.type === "blocked";
              const blockedByMe = item.blockedBy === "me";
              const blockedByThem = item.blockedBy === "them";
              const isUnmatched = item.type === "unmatched";

              return (
                <Pressable
                  className="bg-white p-4 rounded-2xl mb-3 flex-row items-center border border-[#EDE5D5]"
                  onPress={() => {
                    if (item.matchId) {
                      router.push(`/(main)/chat/${item.matchId}`);
                    }
                  }}
                >
                  <View className="relative mr-4">
                    {mainPhoto && !isBlocked ? (
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
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text 
                        className="text-lg font-semibold text-[#1C1208]"
                        numberOfLines={1}
                      >
                        {fullName}
                      </Text>
                      {isBlocked && (
                        <View className="bg-red-500/20 px-2 py-0.5 rounded-full">
                          <Text className="text-red-400 text-xs font-semibold">
                            {blockedByMe ? "Blocked" : "Blocked You"}
                          </Text>
                        </View>
                      )}
                      {isUnmatched && (
                        <View className="bg-yellow-500/20 px-2 py-0.5 rounded-full">
                          <Text className="text-yellow-400 text-xs font-semibold">
                            Unmatched
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-[#9E8E7E] text-sm mt-1">
                      {isBlocked 
                        ? blockedByMe 
                          ? "You blocked this user"
                          : "This user blocked you"
                        : "Previously matched"
                      }
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#FFFFFF" style={{ opacity: 0.5 }} />
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}

