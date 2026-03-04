import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useDiscoverStore } from "../../../lib/stores/discoverStore";
import { supabase } from "../../../lib/supabase";
import { formatLastActive } from "../../../lib/utils/timeUtils";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 54) / 2;

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

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

export default function InterestsScreen() {
  const router = useRouter();
  const sessionSeenIds = useDiscoverStore((s) => s.sessionSeenIds);
  const [received, setReceived] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [seen, setSeen] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"received" | "sent" | "seen">("received");

  const loadReceived = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-received-interests");
      if (error) { console.error("Error fetching received interests:", error); return; }
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      setReceived(parsed?.interests || []);
    } catch (e) {
      console.error("Error loading received:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadSent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-sent-interests");
      if (error) { console.error("Error fetching sent interests:", error); return; }
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      setSent(parsed?.interests || []);
    } catch (e) {
      console.error("Error loading sent:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadSeen = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-seen-profiles", {
        body: { session_ids: sessionSeenIds },
      });
      if (error) { console.error("Error fetching seen profiles:", error); return; }
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      setSeen(parsed?.profiles || []);
    } catch (e) {
      console.error("Error loading seen:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "received") loadReceived();
    else if (activeTab === "sent") loadSent();
    else loadSeen();
  }, [activeTab]);

  // Reload current tab data whenever this screen gains focus (e.g. after navigating back from matches)
  useFocusEffect(
    useCallback(() => {
      if (activeTab === "received") loadReceived();
      else if (activeTab === "sent") loadSent();
      else loadSeen();
    }, [activeTab])
  );

  // Refresh seen tab when session seen IDs grow (user marks more profiles)
  useEffect(() => {
    if (activeTab === "seen" && sessionSeenIds.length > 0) {
      loadSeen();
    }
  }, [sessionSeenIds.length]);

  // Realtime subscription for interest requests
  useEffect(() => {
    let channel: any = null;
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel("interests-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "interest_requests" },
          (payload: any) => {
            const record = payload.new || payload.old;
            if (record?.recipient_id === user.id || record?.sender_id === user.id) {
              if (activeTab === "received") loadReceived();
              else if (activeTab === "sent") loadSent();
            }
          }
        )
        .subscribe();
    };
    setupSubscription();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [activeTab]);

  // Count badges — only actionable items
  const receivedActionCount = received.filter((r) => r.status === "pending").length;
  const sentActionCount = sent.filter((s) => s.status === "awaiting_answers").length;

  const tabs = [
    { key: "received" as const, label: "Interested in Me", count: receivedActionCount },
    { key: "sent" as const, label: "My Interests", count: sentActionCount },
    { key: "seen" as const, label: "Passed On", count: seen.length },
  ];

  if (loading && !received.length && !sent.length && !seen.length) {
    return (
      <View className="flex-1 bg-[#FDFAF5] items-center justify-center">
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  const renderReceivedItem = ({ item }: { item: any }) => {
    const profile = item.sender_profile || {};
    let mainPhoto: string | null = null;
    if (profile.photos?.length > 0) {
      for (const photo of profile.photos) {
        const cleaned = cleanPhotoUrl(photo);
        if (cleaned) { mainPhoto = cleaned; break; }
      }
    }
    const fullName = profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.name || "Unknown";
    const age = calculateAge(profile.dob);

    const handlePress = () => {
      router.push(
        `/(main)/likes/review-interest?interestId=${item.id}&senderId=${item.sender_id}`
      );
    };

    return (
      <Pressable
        className="bg-white rounded-3xl overflow-hidden"
        style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.45, borderWidth: 1, borderColor: "rgba(184,134,11,0.7)" }}
        onPress={handlePress}
      >
        {mainPhoto ? (
          <View style={{ width: "100%", height: "100%", position: "relative" }}>
            <Image source={{ uri: mainPhoto }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
            <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 90, backgroundColor: "rgba(0,0,0,0.6)" }} />
            <View style={{ position: "absolute", bottom: 12, left: 12, right: 12 }}>
              <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                {fullName}{age !== null ? `, ${age}` : ""}
              </Text>
              <View style={{ marginTop: 8, backgroundColor: "#B8860B", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: "flex-start" }}>
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Review</Text>
              </View>
            </View>
          </View>
        ) : (
          <View className="w-full h-full bg-[#F5F0E8] items-center justify-center" style={{ position: "relative" }}>
            <Text className="text-[#9E8E7E] text-4xl">👤</Text>
            <View style={{ position: "absolute", bottom: 12, left: 12, right: 12 }}>
              <Text className="text-[#1C1208] text-lg font-semibold" numberOfLines={1}>{fullName}</Text>
              <View style={{ marginTop: 8, backgroundColor: "#B8860B", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: "flex-start" }}>
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Review</Text>
              </View>
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  const renderSentItem = ({ item }: { item: any }) => {
    const profile = item.recipient_profile || {};
    let mainPhoto: string | null = null;
    if (profile.photos?.length > 0) {
      for (const photo of profile.photos) {
        const cleaned = cleanPhotoUrl(photo);
        if (cleaned) { mainPhoto = cleaned; break; }
      }
    }
    const fullName = profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.name || "Unknown";
    const age = calculateAge(profile.dob);

    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: "bg-yellow-600/20", text: "text-yellow-500", label: "Pending" },
      awaiting_answers: { bg: "bg-orange-500/20", text: "text-orange-400", label: "Answer Questions!" },
      answers_submitted: { bg: "bg-blue-600/20", text: "text-blue-400", label: "Awaiting Review" },
      accepted: { bg: "bg-green-600/20", text: "text-green-500", label: "Accepted" },
      declined: { bg: "bg-red-600/20", text: "text-red-400", label: "Declined" },
      answered_back: { bg: "bg-green-600/20", text: "text-green-500", label: "Matched" },
    };
    const status = statusConfig[item.status] || statusConfig.pending;

    const handlePress = () => {
      if (item.status === "awaiting_answers") {
        router.push(`/(main)/swipe/answer-interest-questions?interestId=${item.id}`);
      } else if ((item.status === "accepted" || item.status === "answered_back") && item.match_id) {
        router.push(`/(main)/chat/${item.match_id}`);
      }
    };

    return (
      <Pressable
        className="bg-white rounded-3xl overflow-hidden"
        style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.45, borderWidth: 1, borderColor: "rgba(184,134,11,0.7)" }}
        onPress={handlePress}
      >
        {mainPhoto ? (
          <View style={{ width: "100%", height: "100%", position: "relative" }}>
            <Image source={{ uri: mainPhoto }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
            <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, backgroundColor: "rgba(0,0,0,0.6)" }} />
            {item.status === "awaiting_answers" && (
              <View style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(249,115,22,0.9)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>ACTION NEEDED</Text>
              </View>
            )}
            <View style={{ position: "absolute", bottom: 12, left: 12, right: 12 }}>
              <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                {fullName}{age !== null ? `, ${age}` : ""}
              </Text>
              <View className="flex-row mt-2">
                <View className={`px-2.5 py-1.5 rounded-full ${status.bg}`}>
                  <Text className={`text-[11px] font-semibold ${status.text}`}>{status.label}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View className="w-full h-full bg-[#F5F0E8] items-center justify-center" style={{ position: "relative" }}>
            <Text className="text-[#9E8E7E] text-4xl">👤</Text>
            {item.status === "awaiting_answers" && (
              <View style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(249,115,22,0.9)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>ACTION NEEDED</Text>
              </View>
            )}
            <View style={{ position: "absolute", bottom: 12, left: 12, right: 12 }}>
              <Text className="text-[#1C1208] text-lg font-semibold" numberOfLines={1}>{fullName}</Text>
              <View className="flex-row mt-2">
                <View className={`px-2.5 py-1.5 rounded-full ${status.bg}`}>
                  <Text className={`text-[11px] font-semibold ${status.text}`}>{status.label}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  const renderSeenItem = ({ item }: { item: any }) => {
    let mainPhoto: string | null = null;
    if (item.photos?.length > 0) {
      for (const photo of item.photos) {
        const cleaned = cleanPhotoUrl(photo);
        if (cleaned) { mainPhoto = cleaned; break; }
      }
    }
    const fullName = item.first_name && item.last_name
      ? `${item.first_name} ${item.last_name}`
      : item.name || "Unknown";
    const age = calculateAge(item.dob);
    const hasBadges = item.is_boosted || item.compatibility_score != null;
    const activeInfo = formatLastActive(item.last_active_at);

    return (
      <Pressable
        className="bg-white rounded-3xl overflow-hidden"
        style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.45, borderWidth: 1, borderColor: "rgba(184,134,11,0.4)" }}
        onPress={() => router.push(`/(main)/swipe/profile-view?userId=${item.id}`)}
      >
        {mainPhoto ? (
          <View style={{ width: "100%", height: "100%", position: "relative" }}>
            <Image source={{ uri: mainPhoto }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.15)" }} />
            <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 90, backgroundColor: "rgba(0,0,0,0.6)" }} />
            {/* Seen badge */}
            <View style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(34,197,94,0.9)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Ionicons name="checkmark-circle" size={12} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>Seen</Text>
            </View>
            <View style={{ position: "absolute", bottom: 12, left: 12, right: 12 }}>
              <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                {fullName}{age !== null ? `, ${age}` : ""}
              </Text>
              {item.city ? (
                <Text className="text-white/70 text-xs mt-1" numberOfLines={1}>{item.city}</Text>
              ) : null}
              {activeInfo && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: activeInfo.dotColor }} />
                  <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 10 }}>{activeInfo.label}</Text>
                </View>
              )}
              {hasBadges && (
                <View style={{ flexDirection: "row", marginTop: 6, gap: 5, flexWrap: "wrap" }}>
                  {item.is_boosted && (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: "rgba(184,134,11,0.35)" }}>
                      <Text style={{ fontSize: 10, color: "#FFD700", fontWeight: "700" }}>Boosted</Text>
                    </View>
                  )}
                  {item.compatibility_score != null && (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: "rgba(184,134,11,0.35)" }}>
                      <Text style={{ fontSize: 10, color: "#FFD700", fontWeight: "700" }}>
                        {item.compatibility_score}% Match
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        ) : (
          <View className="w-full h-full bg-[#F5F0E8] items-center justify-center" style={{ position: "relative" }}>
            <Text className="text-[#9E8E7E] text-4xl">👤</Text>
            <View style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(34,197,94,0.9)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Ionicons name="checkmark-circle" size={12} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>Seen</Text>
            </View>
            <View style={{ position: "absolute", bottom: 12, left: 12, right: 12 }}>
              <Text className="text-[#1C1208] text-lg font-semibold" numberOfLines={1}>{fullName}</Text>
              {hasBadges && (
                <View style={{ flexDirection: "row", marginTop: 6, gap: 5, flexWrap: "wrap" }}>
                  {item.is_boosted && (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: "rgba(184,134,11,0.2)" }}>
                      <Text style={{ fontSize: 10, color: "#B8860B", fontWeight: "700" }}>Boosted</Text>
                    </View>
                  )}
                  {item.compatibility_score != null && (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: "rgba(184,134,11,0.2)" }}>
                      <Text style={{ fontSize: 10, color: "#B8860B", fontWeight: "700" }}>
                        {item.compatibility_score}% Match
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-[#FDFAF5] pt-20 px-4 pb-16">
      {/* Tabs */}
      <View className="flex-row rounded-full px-1 py-1.5 mb-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-full items-center justify-center ${isActive ? "bg-[#B8860B]" : "bg-transparent"}`}
            >
              <Text className={`text-sm font-semibold ${isActive ? "text-black" : "text-[#9E8E7E]"}`}>
                {tab.label}{tab.count > 0 ? ` (${tab.count})` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Received Tab */}
      {activeTab === "received" && (
        received.length === 0 ? (
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-4xl mb-4">💌</Text>
            <Text className="text-[#1C1208] text-lg font-semibold mb-2">No interests yet</Text>
            <Text className="text-[#6B5D4F] text-center text-sm mb-5">
              When someone expresses interest in you, they'll appear here.
            </Text>
            <Pressable className="bg-[#B8860B] px-6 py-3 rounded-full" onPress={() => router.push("/(main)/swipe")}>
              <Text className="text-white font-semibold text-sm">Go to Discover</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={received}
            numColumns={2}
            columnWrapperStyle={{ gap: 14 }}
            contentContainerStyle={{ gap: 16, paddingBottom: 80, paddingTop: 4 }}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadReceived} tintColor="#B8860B" />}
            renderItem={renderReceivedItem}
          />
        )
      )}

      {/* Sent Tab */}
      {activeTab === "sent" && (
        sent.length === 0 ? (
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-4xl mb-4">📤</Text>
            <Text className="text-[#1C1208] text-lg font-semibold mb-2">No sent interests</Text>
            <Text className="text-[#6B5D4F] text-center text-sm mb-5">
              Express interest in someone from their profile page.
            </Text>
            <Pressable className="bg-[#B8860B] px-6 py-3 rounded-full" onPress={() => router.push("/(main)/swipe")}>
              <Text className="text-white font-semibold text-sm">Go to Discover</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={sent}
            numColumns={2}
            columnWrapperStyle={{ gap: 14 }}
            contentContainerStyle={{ gap: 16, paddingBottom: 80, paddingTop: 4 }}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSent} tintColor="#B8860B" />}
            renderItem={renderSentItem}
          />
        )
      )}

      {/* Already Seen Tab */}
      {activeTab === "seen" && (
        seen.length === 0 ? (
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-4xl mb-4">👀</Text>
            <Text className="text-[#1C1208] text-lg font-semibold mb-2">No seen profiles yet</Text>
            <Text className="text-[#6B5D4F] text-center text-sm mb-5">
              Profiles you mark as seen will appear here so you can revisit them.
            </Text>
            <Pressable className="bg-[#B8860B] px-6 py-3 rounded-full" onPress={() => router.push("/(main)/swipe")}>
              <Text className="text-white font-semibold text-sm">Go to Discover</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={seen}
            numColumns={2}
            columnWrapperStyle={{ gap: 14 }}
            contentContainerStyle={{ gap: 16, paddingBottom: 80, paddingTop: 4 }}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSeen} tintColor="#B8860B" />}
            renderItem={renderSeenItem}
          />
        )
      )}
    </View>
  );
}
