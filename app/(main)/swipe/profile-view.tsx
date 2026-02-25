import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LikesProfileView from "../../../components/LikesProfileView";
import { supabase } from "../../../lib/supabase";

export default function ProfileViewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [interestStatus, setInterestStatus] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return;
      setLoading(true);

      try {
        // Load profile
        const { data: profileData } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileData) setProfile(profileData);

        // Check existing interest request
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: existingInterest } = await supabase
            .from("interest_requests")
            .select("status")
            .eq("sender_id", user.id)
            .eq("recipient_id", userId)
            .maybeSingle();

          if (existingInterest) {
            setInterestStatus(existingInterest.status);
          }
        }

        // Get question count
        const { count } = await supabase
          .from("intent_questions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        setQuestionCount(count || 0);

        // Track profile view
        try {
          await supabase.functions.invoke("create-profile-view", {
            body: { viewed_id: userId },
          });
        } catch (_) {}
      } catch (e) {
        console.error("Error loading profile:", e);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  if (loading || !profile) {
    return (
      <View className="flex-1 bg-[#FDFAF5] items-center justify-center">
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  const getStatusBadge = () => {
    switch (interestStatus) {
      case "pending":
        return (
          <View className="bg-yellow-600/20 px-4 py-3 rounded-2xl items-center">
            <Text className="text-yellow-500 font-semibold">Interest Sent - Pending</Text>
          </View>
        );
      case "accepted":
        return (
          <View className="bg-green-600/20 px-4 py-3 rounded-2xl items-center">
            <Text className="text-green-500 font-semibold">Accepted!</Text>
          </View>
        );
      case "declined":
        return (
          <View className="bg-red-600/20 px-4 py-3 rounded-2xl items-center">
            <Text className="text-red-400 font-semibold">Not Reciprocated</Text>
          </View>
        );
      case "answered_back":
        return (
          <View className="bg-green-600/20 px-4 py-3 rounded-2xl items-center">
            <Text className="text-green-500 font-semibold">Matched! They answered back</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-[#FDFAF5]">
      {/* Back Button */}
      <View
        style={{ position: "absolute", top: insets.top + 8, left: 16, zIndex: 10 }}
      >
        <Pressable
          className="w-10 h-10 rounded-full bg-black/35 items-center justify-center"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Profile Content */}
      <LikesProfileView profile={profile} />

      {/* Bottom Action */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 20,
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
        {interestStatus ? (
          getStatusBadge()
        ) : questionCount > 0 ? (
          <Pressable
            className="bg-[#B8860B] px-6 py-4 rounded-2xl items-center flex-row justify-center"
            style={{
              shadowColor: "#B8860B",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.45,
              shadowRadius: 12,
              elevation: 8,
            }}
            onPress={() =>
              router.push(`/(main)/swipe/answer-questions?recipientId=${userId}`)
            }
          >
            <Ionicons name="heart" size={20} color="#1C1208" style={{ marginRight: 8 }} />
            <Text className="text-[#1C1208] text-lg font-bold">
              I'm Interested ({questionCount} questions)
            </Text>
          </Pressable>
        ) : (
          <View className="bg-[#F5F0E8] px-4 py-3 rounded-2xl items-center">
            <Text className="text-[#9E8E7E] font-medium">
              This user hasn't set up their questions yet
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
