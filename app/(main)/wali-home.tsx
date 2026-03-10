import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

interface Wardship {
  id: string;
  user_id: string;
  status: string;
  ward_profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    name: string | null;
    main_photo: string | null;
  } | null;
}

function getDisplayName(profile: any): string {
  if (!profile) return "Unknown";
  if (profile.first_name && profile.last_name)
    return `${profile.first_name} ${profile.last_name}`;
  if (profile.first_name) return profile.first_name;
  return profile.name || "Unknown";
}

export default function WaliHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [wardships, setWardships] = useState<Wardship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWardships();
  }, []);

  const loadWardships = async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "get-chaperone-status"
      );
      if (error) throw error;
      setWardships(data?.wardships || []);
    } catch (err: any) {
      console.error("Error loading wardships:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/");
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFAF5" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 20,
          paddingHorizontal: 24,
          backgroundColor: "#FDFAF5",
          borderBottomWidth: 1,
          borderBottomColor: "#EDE5D5",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "rgba(184,134,11,0.12)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(184,134,11,0.25)",
              }}
            >
              <Ionicons name="shield-checkmark" size={22} color="#B8860B" />
            </View>
            <View>
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#1C1208" }}>
                Wali Dashboard
              </Text>
              <Text style={{ fontSize: 13, color: "#9E8E7E", marginTop: 1 }}>
                Chaperoning {wardships.length} {wardships.length === 1 ? "ward" : "wards"}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleSignOut}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#F5F0E8",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#6B5D4F" />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#B8860B" />
        </View>
      ) : wardships.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "rgba(184,134,11,0.1)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons name="people-outline" size={40} color="#B8860B" />
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#1C1208",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            No Wards Yet
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#9E8E7E",
              textAlign: "center",
              lineHeight: 21,
            }}
          >
            You haven't been assigned as a wali for anyone yet. Ask your ward to
            send you an invite from their profile.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#9E8E7E",
              letterSpacing: 1.2,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Your Wards
          </Text>

          {wardships.map((w) => {
            const name = getDisplayName(w.ward_profile);
            const photo = w.ward_profile?.main_photo;

            return (
              <Pressable
                key={w.id}
                onPress={() =>
                  router.push(
                    `/(main)/profile/chaperone-dashboard?wardId=${w.ward_profile?.id}&wardName=${encodeURIComponent(name)}`
                  )
                }
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: pressed ? "#F5F0E8" : "#FFFFFF",
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#EDE5D5",
                  shadowColor: "#B8860B",
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                })}
              >
                {/* Avatar */}
                {photo ? (
                  <Image
                    source={{ uri: photo }}
                    style={{ width: 56, height: 56, borderRadius: 28 }}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: "#F5F0E8",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="person" size={28} color="#9E8E7E" />
                  </View>
                )}

                {/* Name + label */}
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text
                    style={{ fontSize: 16, fontWeight: "700", color: "#1C1208" }}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 4,
                    }}
                  >
                    <Ionicons name="shield-checkmark" size={12} color="#B8860B" />
                    <Text style={{ fontSize: 12, color: "#B8860B", fontWeight: "600" }}>
                      Active Ward
                    </Text>
                  </View>
                </View>

                {/* Chevron */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: "#B8860B",
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Ionicons name="chatbubbles-outline" size={14} color="#FDFAF5" />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#FDFAF5" }}>
                    View Chats
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
