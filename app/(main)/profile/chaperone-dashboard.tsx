import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";

type Tab = "conversations" | "interests" | "profile";

function getDisplayName(user: any): string {
  if (!user) return "Unknown";
  if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
  if (user.first_name) return user.first_name;
  return user.name || "Unknown";
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function ChaperoneDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wardId, wardName } = useLocalSearchParams<{ wardId: string; wardName: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("conversations");

  // Conversations state
  const [chats, setChats] = useState<any[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);

  // Interests state
  const [interests, setInterests] = useState<any[]>([]);
  const [interestsLoading, setInterestsLoading] = useState(false);

  // Profile state
  const [wardProfile, setWardProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const decodedWardName = wardName ? decodeURIComponent(wardName as string) : "Ward";

  useEffect(() => {
    if (wardId) loadChats();
  }, [wardId]);

  useEffect(() => {
    if (wardId && activeTab === "interests" && interests.length === 0) loadInterests();
    if (wardId && activeTab === "profile" && !wardProfile) loadProfile();
  }, [activeTab, wardId]);

  const loadChats = async () => {
    setChatsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.functions.invoke("get-chaperone-chats", {
        body: { ward_id: wardId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setChats(data?.chats || []);
    } catch (err) {
      console.error("Error loading chaperone chats:", err);
    } finally {
      setChatsLoading(false);
    }
  };

  const loadInterests = async () => {
    setInterestsLoading(true);
    try {
      const { data } = await supabase.functions.invoke("get-chaperone-ward-interests", {
        body: { ward_id: wardId },
      });
      setInterests(data?.interests || []);
    } catch (err) {
      console.error("Error loading interests:", err);
    } finally {
      setInterestsLoading(false);
    }
  };

  const loadProfile = async () => {
    setProfileLoading(true);
    try {
      const { data } = await supabase
        .from("users")
        .select("id, first_name, last_name, name, main_photo, photos, age, city, country, gender, bio, religiosity, marital_status")
        .eq("id", wardId)
        .single();
      setWardProfile(data);
    } catch (err) {
      console.error("Error loading ward profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "conversations", label: "Chats", icon: "chatbubbles-outline" },
    { key: "interests", label: "Interests", icon: "heart-outline" },
    { key: "profile", label: "Profile", icon: "person-outline" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFAF5" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "#FDFAF5",
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#EDE5D5",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: "#F5F0E8", alignItems: "center", justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#1C1208" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#1C1208", fontSize: 17, fontWeight: "700" }}>Wali View</Text>
            <Text style={{ color: "#B8860B", fontSize: 13 }}>{decodedWardName}</Text>
          </View>
          <View
            style={{
              flexDirection: "row", alignItems: "center", gap: 4,
              backgroundColor: "rgba(184,134,11,0.15)", borderRadius: 20,
              paddingHorizontal: 10, paddingVertical: 5,
            }}
          >
            <Ionicons name="shield-checkmark" size={12} color="#B8860B" />
            <Text style={{ color: "#B8860B", fontSize: 11, fontWeight: "600" }}>Read Only</Text>
          </View>
        </View>

        {/* Tabs */}
        <View
          style={{
            flexDirection: "row", marginTop: 14, gap: 8,
          }}
        >
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                gap: 5, paddingVertical: 8, borderRadius: 10,
                backgroundColor: activeTab === tab.key ? "#B8860B" : "#F5F0E8",
              }}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={activeTab === tab.key ? "#FFFFFF" : "#9E8E7E"}
              />
              <Text
                style={{
                  fontSize: 13, fontWeight: "600",
                  color: activeTab === tab.key ? "#FFFFFF" : "#9E8E7E",
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Tab content */}
      {activeTab === "conversations" && (
        chatsLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#B8860B" />
          </View>
        ) : chats.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
            <Ionicons name="chatbubbles-outline" size={52} color="#D1C4A8" />
            <Text style={{ color: "#9E8E7E", fontSize: 16, fontWeight: "600", marginTop: 16, textAlign: "center" }}>
              No conversations yet
            </Text>
            <Text style={{ color: "#C4B8A8", fontSize: 13, textAlign: "center", marginTop: 8 }}>
              {decodedWardName} hasn't started any conversations.
            </Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {chats.map((chat) => {
              const otherName = getDisplayName(chat.other_user);
              const lastMsg = chat.last_message;
              const lastMsgText = lastMsg
                ? lastMsg.image_url ? "Sent an image" : lastMsg.content || ""
                : "No messages yet";
              const timeStr = lastMsg ? formatTime(lastMsg.created_at) : "";

              return (
                <Pressable
                  key={chat.match_id}
                  onPress={() =>
                    router.push(
                      `/(main)/profile/chaperone-chat?wardId=${wardId}&matchId=${chat.match_id}&wardName=${encodeURIComponent(decodedWardName)}&otherName=${encodeURIComponent(otherName)}`
                    )
                  }
                  style={({ pressed }) => ({
                    flexDirection: "row", alignItems: "center",
                    paddingHorizontal: 16, paddingVertical: 14,
                    borderBottomWidth: 1, borderBottomColor: "#EDE5D5",
                    backgroundColor: pressed ? "#F5F0E8" : "#FDFAF5",
                  })}
                >
                  {chat.other_user?.main_photo ? (
                    <Image
                      source={{ uri: chat.other_user.main_photo }}
                      style={{ width: 52, height: 52, borderRadius: 26 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#F5F0E8", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="person" size={24} color="#9E8E7E" />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                      <Text style={{ color: "#1C1208", fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
                        {otherName}
                      </Text>
                      {timeStr ? <Text style={{ color: "#9E8E7E", fontSize: 12 }}>{timeStr}</Text> : null}
                    </View>
                    <Text style={{ color: "#9E8E7E", fontSize: 13 }} numberOfLines={1}>
                      {lastMsgText}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#C4B8A8" style={{ marginLeft: 8 }} />
                </Pressable>
              );
            })}
          </ScrollView>
        )
      )}

      {activeTab === "interests" && (
        interestsLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#B8860B" />
          </View>
        ) : interests.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
            <Ionicons name="heart-outline" size={52} color="#D1C4A8" />
            <Text style={{ color: "#9E8E7E", fontSize: 16, fontWeight: "600", marginTop: 16, textAlign: "center" }}>
              No interests yet
            </Text>
            <Text style={{ color: "#C4B8A8", fontSize: 13, textAlign: "center", marginTop: 8 }}>
              No one has shown interest in {decodedWardName} yet.
            </Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: "#9E8E7E", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>
              {interests.length} {interests.length === 1 ? "person" : "people"} interested
            </Text>
            {interests.map((item) => {
              const senderName = getDisplayName(item.sender_profile);
              const statusColors: Record<string, string> = {
                pending: "#F59E0B",
                accepted: "#10B981",
                rejected: "#EF4444",
              };
              return (
                <View
                  key={item.id}
                  style={{
                    flexDirection: "row", alignItems: "center",
                    backgroundColor: "#FFFFFF", borderRadius: 16,
                    padding: 14, borderWidth: 1, borderColor: "#EDE5D5",
                  }}
                >
                  {item.sender_profile?.main_photo ? (
                    <Image
                      source={{ uri: item.sender_profile.main_photo }}
                      style={{ width: 52, height: 52, borderRadius: 26 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#F5F0E8", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="person" size={24} color="#9E8E7E" />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: "#1C1208", fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
                      {senderName}
                    </Text>
                    {item.sender_profile?.city && (
                      <Text style={{ color: "#9E8E7E", fontSize: 12, marginTop: 2 }}>
                        {item.sender_profile.city}
                        {item.sender_profile.country ? `, ${item.sender_profile.country}` : ""}
                      </Text>
                    )}
                    <Text style={{ color: "#C4B8A8", fontSize: 11, marginTop: 2 }}>
                      {timeAgo(item.created_at)}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                      backgroundColor: `${statusColors[item.status] || "#9E8E7E"}20`,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "600", color: statusColors[item.status] || "#9E8E7E", textTransform: "capitalize" }}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )
      )}

      {activeTab === "profile" && (
        profileLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#B8860B" />
          </View>
        ) : !wardProfile ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#9E8E7E" }}>Profile not available</Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
            {/* Main photo */}
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              {wardProfile.main_photo ? (
                <Image
                  source={{ uri: wardProfile.main_photo }}
                  style={{ width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: "#B8860B" }}
                  contentFit="cover"
                />
              ) : (
                <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: "#F5F0E8", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#EDE5D5" }}>
                  <Ionicons name="person" size={50} color="#9E8E7E" />
                </View>
              )}
              <Text style={{ fontSize: 22, fontWeight: "700", color: "#1C1208", marginTop: 12 }}>
                {getDisplayName(wardProfile)}
              </Text>
              {(wardProfile.city || wardProfile.country) && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <Ionicons name="location-outline" size={13} color="#9E8E7E" />
                  <Text style={{ color: "#9E8E7E", fontSize: 13 }}>
                    {[wardProfile.city, wardProfile.country].filter(Boolean).join(", ")}
                  </Text>
                </View>
              )}
            </View>

            {/* Details card */}
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#EDE5D5", gap: 12 }}>
              {[
                { label: "Age", value: wardProfile.age ? `${wardProfile.age} years` : null },
                { label: "Gender", value: wardProfile.gender },
                { label: "Religiosity", value: wardProfile.religiosity },
                { label: "Marital Status", value: wardProfile.marital_status },
              ]
                .filter((r) => r.value)
                .map((row) => (
                  <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 13, color: "#9E8E7E" }}>{row.label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#1C1208", textTransform: "capitalize" }}>
                      {row.value}
                    </Text>
                  </View>
                ))}
            </View>

            {/* Bio */}
            {wardProfile.bio && (
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#EDE5D5" }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#9E8E7E", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                  About
                </Text>
                <Text style={{ fontSize: 14, color: "#4B3F35", lineHeight: 22 }}>{wardProfile.bio}</Text>
              </View>
            )}

            {/* Photo grid */}
            {wardProfile.photos?.length > 1 && (
              <View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#9E8E7E", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                  Photos
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {wardProfile.photos.slice(0, 6).map((url: string, i: number) => (
                    <Image
                      key={i}
                      source={{ uri: url }}
                      style={{ width: "30%", aspectRatio: 1, borderRadius: 12 }}
                      contentFit="cover"
                    />
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )
      )}
    </View>
  );
}
