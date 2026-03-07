import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import LikesProfileView from "../../../components/LikesProfileView";
import { useInterestStore } from "../../../lib/stores/interestStore";
import { supabase } from "../../../lib/supabase";

export default function ReviewInterestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { interestId, senderId } = useLocalSearchParams<{
    interestId: string;
    senderId: string;
  }>();

  const respondToInterest = useInterestStore((s) => s.respondToInterest);
  const isSubmitting = useInterestStore((s) => s.isSubmitting);

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!senderId || !interestId) return;
      try {
        const { data: profileData } = await supabase
          .from("users")
          .select("*")
          .eq("id", senderId)
          .single();
        if (profileData) setProfile(profileData);
      } catch (e) {
        console.error("Error loading profile:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [senderId, interestId]);

  const handleAccept = async () => {
    if (!interestId) return;
    const result = await respondToInterest(interestId, "accept");
    if (result.success) {
      let myPhoto = "";
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: myProfile } = await supabase
            .from("users")
            .select("photos")
            .eq("id", user.id)
            .single();
          myPhoto = myProfile?.photos?.[0] || "";
        }
      } catch {}

      router.replace({
        pathname: "/(main)/matches",
        params: {
          matchId: result.match_id || "",
          otherUserName: profile?.first_name || profile?.name || "",
          otherUserPhoto: profile?.photos?.[0] || "",
          myPhoto,
        },
      });
    } else {
      Alert.alert("Error", result.error || "Failed to accept interest.");
    }
  };

  const handleDecline = async () => {
    if (!interestId) return;
    Alert.alert("Decline Interest", "Are you sure you want to decline?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          const result = await respondToInterest(interestId, "decline");
          if (result.success) {
            router.back();
          } else {
            Alert.alert("Error", result.error || "Failed to decline.");
          }
        },
      },
    ]);
  };

  if (loading || !profile) {
    return (
      <View className="flex-1 bg-[#FDFAF5] items-center justify-center">
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FDFAF5]">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="px-5 pb-3 flex-row items-center"
      >
        <Pressable
          className="w-10 h-10 rounded-full bg-[#F5F0E8] items-center justify-center mr-3"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#1C1208" />
        </Pressable>
        <Text className="text-[#1C1208] text-xl font-bold flex-1">
          Review Interest
        </Text>
        <Pressable
          className="px-3 py-1.5 rounded-full bg-[#F5F0E8]"
          onPress={() => setShowProfile(!showProfile)}
        >
          <Text className="text-[#6B5D4F] text-sm font-medium">
            {showProfile ? "Hide" : "View Profile"}
          </Text>
        </Pressable>
      </View>

      {showProfile ? (
        <LikesProfileView profile={profile} />
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 180 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-[#9E8E7E] text-sm mt-4">
            {profile.first_name || profile.name || "This person"} is interested in you.
          </Text>
        </ScrollView>
      )}

      {/* Action Bar */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 16,
          paddingTop: 16,
          backgroundColor: "rgba(253,250,245,0.97)",
          borderTopWidth: 1,
          borderTopColor: "rgba(184,134,11,0.2)",
          shadowColor: "#B8860B",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        <View className="flex-row gap-3">
          <Pressable
            className="flex-1 py-4 rounded-2xl items-center bg-red-900/30 border border-red-500/30"
            onPress={handleDecline}
            disabled={isSubmitting}
          >
            <Text className="text-red-400 font-bold text-base">Decline</Text>
          </Pressable>
          <Pressable
            className="flex-[2] py-4 rounded-2xl items-center bg-[#B8860B]"
            style={{
              shadowColor: "#B8860B",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.45,
              shadowRadius: 12,
              elevation: 8,
            }}
            onPress={handleAccept}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#1C1208" />
            ) : (
              <Text className="text-white font-bold text-base">Accept Interest</Text>
            )}
          </Pressable>
        </View>
      </View>

    </View>
  );
}
