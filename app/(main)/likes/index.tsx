import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDiscoverStore } from "../../../lib/stores/discoverStore";
import { supabase } from "../../../lib/supabase";
import { formatLastActive } from "../../../lib/utils/timeUtils";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 54) / 2;

const seenCardStyle = {
  width: CARD_WIDTH,
  height: CARD_WIDTH * 1.65,
  borderRadius: 20,
  overflow: "hidden" as const,
  backgroundColor: "#F5F0E8",
  borderWidth: 1,
  borderColor: "rgba(184,134,11,0.7)",
  shadowColor: "#B8860B",
  shadowOpacity: 0.22,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
};

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
  const insets = useSafeAreaInsets();
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
    const activeInfo = formatLastActive(item.last_active_at);
    const isOnline = activeInfo?.dotColor === "#22C55E" || activeInfo?.label?.toLowerCase() === "online";
    const city = item.city || "";
    const country = item.country || "";
    const location = [city, country].filter(Boolean).join(", ");
    const rawScore = item.compatibility_score;
    const compatibilityScore = rawScore != null
      ? (rawScore > 1 ? Math.round(rawScore) : Math.round(rawScore * 100))
      : null;

    return (
      <Pressable
        style={seenCardStyle}
        onPress={() => router.push(`/(main)/swipe/profile-view?userId=${item.id}`)}
      >
        {mainPhoto ? (
          <Image
            source={{ uri: mainPhoto }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F5F0E8" }]} />
        )}

        {/* Bottom gradient */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.25)", "rgba(0,0,0,0.72)"]}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%" }}
          pointerEvents="none"
        />

        {/* Top row — Online + Compatibility */}
        <View style={{ position: "absolute", top: 10, left: 10, right: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          {isOnline ? (
            <View style={{ backgroundColor: "rgba(0,0,0,0.42)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" }}>
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>Online</Text>
            </View>
          ) : <View />}
          {compatibilityScore !== null && (
            <View style={{ backgroundColor: "#C9980A", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{compatibilityScore}%</Text>
            </View>
          )}
        </View>

        {/* Bottom info */}
        <View style={{ position: "absolute", bottom: 12, left: 12, right: 12, gap: 3 }}>
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.1 }} numberOfLines={1}>
            {fullName}{age !== null ? `, ${age}` : ""}
          </Text>
          {!!location && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.85)" />
              <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 11, fontWeight: "500" }} numberOfLines={1}>
                {location}
              </Text>
            </View>
          )}
          {activeInfo && !isOnline && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: activeInfo.dotColor }} />
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 10 }}>{activeInfo.label}</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}>
      <LinearGradient
        colors={["#FFF2B8", "#FDF8EE", "#FDFAF5"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.52 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }}>
        <Text style={{ fontSize: 26, fontWeight: "900", letterSpacing: -0.8, color: "#1C1208", marginBottom: 14 }}>
          ik<Text style={{ color: "#B8860B" }}>htiar</Text>
        </Text>

        {/* Tab bar */}
        <LinearGradient
          colors={["rgba(212,160,23,0.18)", "rgba(184,134,11,0.08)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flexDirection: "row",
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "rgba(184,134,11,0.38)",
            padding: 3,
            shadowColor: "#B8860B",
            shadowOpacity: 0.12,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 3,
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{ flex: 1, borderRadius: 999, overflow: "hidden" }}
              >
                {isActive ? (
                  <LinearGradient
                    colors={["#E8B820", "#C9980A", "#A87A08"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 9,
                      paddingHorizontal: 4,
                      borderRadius: 999,
                      gap: 5,
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: "800", color: "#fff", letterSpacing: 0.1 }} numberOfLines={1}>
                      {tab.label}
                    </Text>
                    {tab.count > 0 && (
                      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{tab.count}</Text>
                      </View>
                    )}
                  </LinearGradient>
                ) : (
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 9,
                    paddingHorizontal: 4,
                    borderRadius: 999,
                    gap: 5,
                  }}>
                    <Text style={{ fontSize: 11.5, fontWeight: "500", color: "rgba(184,134,11,0.6)" }} numberOfLines={1}>
                      {tab.label}
                    </Text>
                    {tab.count > 0 && (
                      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "rgba(184,134,11,0.3)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{tab.count}</Text>
                      </View>
                    )}
                  </View>
                )}
              </Pressable>
            );
          })}
        </LinearGradient>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>

      {/* Received Tab */}
      {activeTab === "received" && (
        received.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
            <LinearGradient
              colors={["#FFFFFF", "#FFF8E8", "#FFF2CC"]}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={{ width: "100%", borderRadius: 28, padding: 32, alignItems: "center", borderWidth: 1, borderColor: "rgba(184,134,11,0.2)", shadowColor: "#B8860B", shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}
            >
              <Image
                source={require('../../../assets/Logos/transparent-logo.png')}
                style={{ width: 280, height: 140, marginBottom: 20 }}
                contentFit="contain"
              />
              <Text style={{ color: "#1C1208", fontSize: 20, fontWeight: "800", textAlign: "center", letterSpacing: -0.3, marginBottom: 8 }}>No interests yet</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, width: "70%" }}>
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(184,134,11,0.2)" }} />
                <Ionicons name="heart" size={11} color="#B8860B" style={{ opacity: 0.5 }} />
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(184,134,11,0.2)" }} />
              </View>
              <Text style={{ color: "#6B5D4F", fontSize: 13.5, textAlign: "center", lineHeight: 21, marginBottom: 24 }}>
                When someone expresses interest in you, they'll appear here.
              </Text>
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
            </LinearGradient>
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
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
            <LinearGradient
              colors={["#FFFFFF", "#FFF8E8", "#FFF2CC"]}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={{ width: "100%", borderRadius: 28, padding: 32, alignItems: "center", borderWidth: 1, borderColor: "rgba(184,134,11,0.2)", shadowColor: "#B8860B", shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}
            >
              <Image
                source={require('../../../assets/Logos/transparent-logo.png')}
                style={{ width: 280, height: 140, marginBottom: 20 }}
                contentFit="contain"
              />
              <Text style={{ color: "#1C1208", fontSize: 20, fontWeight: "800", textAlign: "center", letterSpacing: -0.3, marginBottom: 8 }}>No sent interests</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, width: "70%" }}>
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(184,134,11,0.2)" }} />
                <Ionicons name="heart" size={11} color="#B8860B" style={{ opacity: 0.5 }} />
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(184,134,11,0.2)" }} />
              </View>
              <Text style={{ color: "#6B5D4F", fontSize: 13.5, textAlign: "center", lineHeight: 21, marginBottom: 24 }}>
                Express interest in someone from their profile to get started.
              </Text>
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
            </LinearGradient>
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
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
            <LinearGradient
              colors={["#FFFFFF", "#FFF8E8", "#FFF2CC"]}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={{ width: "100%", borderRadius: 28, padding: 32, alignItems: "center", borderWidth: 1, borderColor: "rgba(184,134,11,0.2)", shadowColor: "#B8860B", shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}
            >
              <Image
                source={require('../../../assets/Logos/transparent-logo.png')}
                style={{ width: 280, height: 140, marginBottom: 20 }}
                contentFit="contain"
              />
              <Text style={{ color: "#1C1208", fontSize: 20, fontWeight: "800", textAlign: "center", letterSpacing: -0.3, marginBottom: 8 }}>No seen profiles yet</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, width: "70%" }}>
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(184,134,11,0.2)" }} />
                <Ionicons name="heart" size={11} color="#B8860B" style={{ opacity: 0.5 }} />
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(184,134,11,0.2)" }} />
              </View>
              <Text style={{ color: "#6B5D4F", fontSize: 13.5, textAlign: "center", lineHeight: 21, marginBottom: 24 }}>
                Profiles you mark as seen will appear here so you can revisit them.
              </Text>
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
            </LinearGradient>
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
    </View>
  );
}
