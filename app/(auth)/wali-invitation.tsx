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

interface PendingInvite {
  id: string;
  wali_name: string | null;
  relationship: string | null;
  ward_profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    name: string | null;
    main_photo: string | null;
  } | null;
}

function getDisplayName(profile: any): string {
  if (!profile) return "Someone";
  if (profile.first_name && profile.last_name)
    return `${profile.first_name} ${profile.last_name}`;
  if (profile.first_name) return profile.first_name;
  return profile.name || "Someone";
}

export default function WaliInvitationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [invite, setInvite] = useState<PendingInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    loadInvite();
  }, []);

  const loadInvite = async () => {
    try {
      const { data } = await supabase.functions.invoke("get-chaperone-status");
      const pending = (data?.wardships || []).find((w: any) => w.status === "pending");
      setInvite(pending || null);
    } catch (err) {
      console.error("Error loading invite:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const handleAccept = async () => {
    setActing(true);
    try {
      const { data, error } = await supabase.functions.invoke("accept-chaperone-invite");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      router.replace("/(auth)/wali-onboarding");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to accept. Please try again.");
    } finally {
      setActing(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      "Decline Invitation",
      "Are you sure you want to decline this Wali invitation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            if (!invite) return;
            setActing(true);
            try {
              await supabase.functions.invoke("decline-chaperone", {
                body: { link_id: invite.id },
              });
            } catch {
              // Ignore — sign out regardless
            }
            await supabase.auth.signOut();
            router.replace("/");
          },
        },
      ]
    );
  };

  const wardName = getDisplayName(invite?.ward_profile);

  // Height of pinned buttons section (Accept + Decline + padding)
  const BUTTONS_HEIGHT = 160 + insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFAF5" }}>
      {/* Back button */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 4 }}>
        <Pressable
          onPress={handleBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#F5F0E8",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#EDE5D5",
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#1C1208" />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#B8860B" />
        </View>
      ) : (
        <>
          {/* Scrollable content — padded at bottom so it clears the pinned buttons */}
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 28,
              paddingTop: 16,
              paddingBottom: BUTTONS_HEIGHT + 16,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Shield icon + title */}
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "rgba(184,134,11,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "rgba(184,134,11,0.3)",
                  marginBottom: 16,
                }}
              >
                <Ionicons name="shield-checkmark" size={38} color="#B8860B" />
              </View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: "#B8860B",
                  letterSpacing: 2.5,
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Wali Invitation
              </Text>
              <Text
                style={{
                  fontSize: 26,
                  fontWeight: "700",
                  color: "#1C1208",
                  textAlign: "center",
                }}
              >
                You have been invited{"\n"}as a Wali
              </Text>
            </View>

            {/* Ward card */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: "#EDE5D5",
                marginBottom: 16,
                shadowColor: "#B8860B",
                shadowOpacity: 0.08,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 }}>
                {invite?.ward_profile?.main_photo ? (
                  <Image
                    source={{ uri: invite.ward_profile.main_photo }}
                    style={{ width: 60, height: 60, borderRadius: 30 }}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: "#F5F0E8",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="person" size={30} color="#9E8E7E" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#1C1208" }}>
                    {wardName}
                  </Text>
                  {invite?.relationship && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <Ionicons name="people" size={13} color="#B8860B" />
                      <Text style={{ fontSize: 13, color: "#B8860B", fontWeight: "600" }}>
                        {invite.relationship}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={{ fontSize: 14, color: "#6B5D4F", lineHeight: 22 }}>
                <Text style={{ fontWeight: "600", color: "#1C1208" }}>{wardName}</Text>
                {" "}has invited you to act as their guardian (Wali) on Ikhtiar.
              </Text>
            </View>

            {/* Role description */}
            <View
              style={{
                backgroundColor: "rgba(184,134,11,0.08)",
                borderRadius: 14,
                padding: 16,
                borderLeftWidth: 3,
                borderLeftColor: "#B8860B",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#B8860B", marginBottom: 10 }}>
                Your role as Wali may include:
              </Text>
              {[
                "Reviewing potential matches",
                "Monitoring conversations (read-only)",
                "Supporting the marriage process",
              ].map((item) => (
                <View
                  key={item}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}
                >
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#B8860B" }} />
                  <Text style={{ fontSize: 13, color: "#6B5D4F", flex: 1 }}>{item}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Buttons — absolutely pinned at bottom, guaranteed visible */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "#FDFAF5",
              paddingHorizontal: 28,
              paddingTop: 16,
              paddingBottom: insets.bottom + 20,
              borderTopWidth: 1,
              borderTopColor: "#EDE5D5",
            }}
          >
            <Pressable
              onPress={handleAccept}
              disabled={acting}
              style={{
                backgroundColor: "#B8860B",
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                marginBottom: 12,
                opacity: acting ? 0.7 : 1,
              }}
            >
              {acting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                  Accept
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleDecline}
              disabled={acting}
              style={{
                backgroundColor: "#F5F0E8",
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#EDE5D5",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#9E8E7E" }}>
                Decline
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
