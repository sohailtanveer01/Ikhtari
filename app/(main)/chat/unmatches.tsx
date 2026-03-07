import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";

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

export default function UnmatchesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
    // Clear the notification badge when this screen is opened
    queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
  }, [queryClient]);

  // Real-time subscription
  useEffect(() => {
    let channel: any = null;
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const uid = user.id;
      channel = supabase
        .channel("unmatches-screen-updates")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "unmatches" }, (payload) => {
          if (payload.new.user1_id === uid || payload.new.user2_id === uid) {
            queryClient.invalidateQueries({ queryKey: ["unmatches"] });
            queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
          }
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "unmatches" }, (payload) => {
          if (payload.new.user1_id === uid || payload.new.user2_id === uid) {
            queryClient.invalidateQueries({ queryKey: ["unmatches"] });
            queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
          }
        })
        .subscribe();
    };
    setup();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: unmatchesData, isLoading, error, refetch } = useQuery({
    queryKey: ["unmatches"],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("get-unmatches");
      if (error) throw error;
      return data?.users || [];
    },
    staleTime: 1000 * 60 * 1,
    gcTime: 1000 * 60 * 5,
  });

  const unmatches = unmatchesData || [];

  // --- Actions ---

  const handleRequestRematch = async (item: any) => {
    setLoadingId(item.userId);
    try {
      const { error } = await supabase.functions.invoke("request-rematch", {
        body: { matchId: item.matchId, otherUserId: item.userId },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["unmatches"] });
      queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
    } catch (err: any) {
      Alert.alert("Could not send request", err.message || "Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleAcceptRematch = async (item: any) => {
    setLoadingId(item.userId);
    try {
      const { data, error } = await supabase.functions.invoke("accept-rematch", {
        body: { matchId: item.matchId },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["chat-list"] });
      queryClient.invalidateQueries({ queryKey: ["unmatches"] });
      queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
      if (data?.matchId) {
        router.back();
        router.push(`/(main)/chat/${data.matchId}`);
      }
    } catch (err: any) {
      Alert.alert("Could not accept", err.message || "Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeclineRematch = async (item: any) => {
    const firstName = item.user?.first_name || "this user";
    Alert.alert(
      "Decline Rematch",
      `Decline the rematch request from ${firstName}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            setLoadingId(item.userId);
            try {
              const { error } = await supabase.functions.invoke("reject-rematch", {
                body: { matchId: item.matchId },
              });
              if (error) throw error;
              queryClient.invalidateQueries({ queryKey: ["unmatches"] });
              queryClient.invalidateQueries({ queryKey: ["unmatches-notification-count"] });
            } catch (err: any) {
              Alert.alert("Error", err.message || "Please try again.");
            } finally {
              setLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // --- Render helpers ---

  const renderUnmatchItem = ({ item }: { item: any }) => {
    const mainPhoto = cleanPhotoUrl(item.user?.photos?.[0]);
    const firstName = item.user?.first_name || item.user?.name?.split(" ")[0] || "Unknown";
    const fullName =
      item.user?.first_name && item.user?.last_name
        ? `${item.user.first_name} ${item.user.last_name}`
        : item.user?.name || "Unknown";

    const rematchStatus = item.rematch_status as string | null;
    const iAmRequester = !!item.rematch_requested_by && item.rematch_requested_by === currentUserId;
    const iAmRecipient = !!item.rematch_requested_by && item.rematch_requested_by !== currentUserId;
    const isItemLoading = loadingId === item.userId;

    // Derive per-state display values
    let statusLabel = "";
    let statusColor = "#9E8E7E";
    let statusBg = "rgba(158,142,126,0.12)";
    let bodyText = "";
    let showRequestBtn = false;
    let showAcceptDecline = false;
    let showAwaiting = false;
    let showTerminal = false;

    if (!rematchStatus) {
      // No rematch activity
      if (item.unmatchedBy === "me") {
        statusLabel = "You Unmatched";
        statusColor = "#9E8E7E";
        statusBg = "rgba(158,142,126,0.12)";
        bodyText = "You ended this connection";
      } else {
        statusLabel = "They Unmatched";
        statusColor = "#B8860B";
        statusBg = "rgba(184,134,11,0.12)";
        bodyText = `${firstName} ended your match`;
      }
      showRequestBtn = true;
    } else if (rematchStatus === "pending") {
      if (iAmRequester) {
        statusLabel = "Request Sent";
        statusColor = "#C9980A";
        statusBg = "rgba(201,152,10,0.12)";
        bodyText = `Waiting for ${firstName} to respond`;
        showAwaiting = true;
      } else if (iAmRecipient) {
        statusLabel = "Wants to Reconnect";
        statusColor = "#22C55E";
        statusBg = "rgba(34,197,94,0.12)";
        bodyText = `${firstName} wants to reconnect with you`;
        showAcceptDecline = true;
      }
    } else if (rematchStatus === "rejected") {
      if (iAmRequester) {
        statusLabel = "Rematch Declined";
        statusColor = "#EF4444";
        statusBg = "rgba(239,68,68,0.12)";
        bodyText = `${firstName} declined your request`;
      } else {
        statusLabel = "Request Declined";
        statusColor = "#9E8E7E";
        statusBg = "rgba(158,142,126,0.12)";
        bodyText = "You declined their rematch request";
      }
      showTerminal = true;
    }

    return (
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          marginBottom: 12,
          borderWidth: 1.5,
          borderColor: showAcceptDecline
            ? "rgba(34,197,94,0.35)"
            : "rgba(184,134,11,0.35)",
          shadowColor: "#B8860B",
          shadowOpacity: 0.07,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
          overflow: "hidden",
        }}
      >
        {/* Main row */}
        <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
          {/* Avatar */}
          <View style={{ marginRight: 14 }}>
            {mainPhoto ? (
              <Image
                source={{ uri: mainPhoto }}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  borderWidth: 2,
                  borderColor: "rgba(184,134,11,0.35)",
                }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "#F5F0E8",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "rgba(184,134,11,0.25)",
                }}
              >
                <Text style={{ fontSize: 26 }}>👤</Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 8 }}>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#1C1208", flex: 1 }}
                numberOfLines={1}
              >
                {fullName}
              </Text>
              <View
                style={{
                  backgroundColor: statusBg,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                }}
              >
                <Text
                  style={{ fontSize: 10, fontWeight: "700", color: statusColor, letterSpacing: 0.3 }}
                >
                  {statusLabel}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12.5, color: "#9E8E7E", lineHeight: 18 }} numberOfLines={2}>
              {bodyText}
            </Text>
          </View>
        </View>

        {/* Action footer */}
        {(showRequestBtn || showAcceptDecline || showAwaiting || showTerminal) && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: "rgba(184,134,11,0.08)",
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            {/* Request Rematch */}
            {showRequestBtn && (
              <Pressable
                onPress={() => handleRequestRematch(item)}
                disabled={isItemLoading}
                style={({ pressed }) => ({
                  borderRadius: 999,
                  overflow: "hidden",
                  opacity: isItemLoading ? 0.65 : pressed ? 0.85 : 1,
                })}
              >
                <LinearGradient
                  colors={["#E8B820", "#C9980A", "#A87A08"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    gap: 7,
                  }}
                >
                  {isItemLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={15} color="#fff" />
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                        Request Rematch
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            )}

            {/* Accept / Decline */}
            {showAcceptDecline && (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => handleDeclineRematch(item)}
                  disabled={isItemLoading}
                  style={({ pressed }) => ({
                    flex: 1,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: "rgba(239,68,68,0.45)",
                    paddingVertical: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isItemLoading ? 0.65 : pressed ? 0.75 : 1,
                  })}
                >
                  {isItemLoading ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 14 }}>Decline</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => handleAcceptRematch(item)}
                  disabled={isItemLoading}
                  style={({ pressed }) => ({
                    flex: 2,
                    borderRadius: 999,
                    overflow: "hidden",
                    opacity: isItemLoading ? 0.65 : pressed ? 0.85 : 1,
                  })}
                >
                  <LinearGradient
                    colors={["#E8B820", "#C9980A", "#A87A08"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 12,
                      gap: 7,
                    }}
                  >
                    {isItemLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                          Accept Rematch
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            )}

            {/* Awaiting response */}
            {showAwaiting && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  paddingVertical: 6,
                }}
              >
                <Ionicons name="time-outline" size={15} color="#C9980A" />
                <Text style={{ color: "#C9980A", fontSize: 13.5, fontWeight: "600", fontStyle: "italic" }}>
                  Awaiting their response…
                </Text>
              </View>
            )}

            {/* Terminal state — rejected */}
            {showTerminal && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  paddingVertical: 6,
                }}
              >
                <Ionicons name="close-circle-outline" size={15} color="#9E8E7E" />
                <Text style={{ color: "#9E8E7E", fontSize: 13.5, fontStyle: "italic" }}>
                  This connection has ended
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderBlockedItem = ({ item }: { item: any }) => {
    const fullName =
      item.user?.first_name && item.user?.last_name
        ? `${item.user.first_name} ${item.user.last_name}`
        : item.user?.name || "Unknown";
    const blockedByThem = item.blockedBy === "them";

    return (
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          marginBottom: 12,
          borderWidth: 1.5,
          borderColor: "rgba(239,68,68,0.25)",
          overflow: "hidden",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "#F5F0E8",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 14,
              borderWidth: 2,
              borderColor: "rgba(239,68,68,0.18)",
            }}
          >
            <Text style={{ fontSize: 26 }}>👤</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 8 }}>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#1C1208", flex: 1 }}
                numberOfLines={1}
              >
                {fullName}
              </Text>
              <View
                style={{
                  backgroundColor: "rgba(239,68,68,0.1)",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#EF4444" }}>
                  {blockedByThem ? "Blocked You" : "Blocked"}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12.5, color: "#9E8E7E" }}>
              {blockedByThem ? "This user blocked you" : "You blocked this user"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // --- Screen ---

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FDFAF5", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FDFAF5",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Text style={{ color: "#EF4444", textAlign: "center", marginBottom: 16 }}>
          Error loading: {(error as Error).message}
        </Text>
        <Pressable onPress={() => refetch()} style={{ borderRadius: 999, overflow: "hidden" }}>
          <LinearGradient
            colors={["#E8B820", "#C9980A", "#A87A08"]}
            style={{ paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  const unmatchedItems = unmatches.filter((u: any) => u.type === "unmatched");
  const blockedItems = unmatches.filter((u: any) => u.type === "blocked");
  const allItems = [...unmatchedItems, ...blockedItems];

  // Count items needing attention for the header badge
  const pendingCount = unmatches.filter(
    (u: any) =>
      u.type === "unmatched" &&
      u.rematch_status === "pending" &&
      u.rematch_requested_by !== currentUserId
  ).length;

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
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 16,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: pressed ? "rgba(184,134,11,0.1)" : "rgba(184,134,11,0.06)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          })}
        >
          <Ionicons name="arrow-back" size={22} color="#1C1208" />
        </Pressable>

        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: "#1C1208",
            letterSpacing: -0.3,
            flex: 1,
          }}
        >
          Past Connections
        </Text>

        {pendingCount > 0 && (
          <View
            style={{
              backgroundColor: "#22C55E",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>
              {pendingCount} pending
            </Text>
          </View>
        )}
      </View>

      {/* Divider */}
      <View
        style={{
          height: 1,
          backgroundColor: "rgba(184,134,11,0.1)",
          marginHorizontal: 20,
          marginBottom: 12,
        }}
      />

      {/* Explanation banner */}
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 12,
          backgroundColor: "rgba(184,134,11,0.07)",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "rgba(184,134,11,0.18)",
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <Ionicons name="information-circle-outline" size={18} color="#B8860B" style={{ marginTop: 1 }} />
        <Text style={{ color: "#7A6240", fontSize: 12.5, lineHeight: 19, flex: 1 }}>
          Connections you've unmatched or been unmatched from. Either side can request a rematch — the other person must accept.
        </Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {allItems.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "rgba(184,134,11,0.08)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <Ionicons name="checkmark-circle" size={44} color="#B8860B" />
            </View>
            <Text
              style={{
                color: "#1C1208",
                fontSize: 20,
                fontWeight: "800",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              All connections active
            </Text>
            <Text
              style={{
                color: "#9E8E7E",
                fontSize: 14,
                textAlign: "center",
                lineHeight: 21,
              }}
            >
              No ended connections here. Keep building meaningful relationships.
            </Text>
          </View>
        ) : (
          <FlatList
            data={allItems}
            keyExtractor={(item) => `${item.userId}-${item.type}`}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingTop: 4 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={() => refetch()}
                tintColor="#B8860B"
              />
            }
            renderItem={({ item }) =>
              item.type === "blocked"
                ? renderBlockedItem({ item })
                : renderUnmatchItem({ item })
            }
          />
        )}
      </View>
    </View>
  );
}
