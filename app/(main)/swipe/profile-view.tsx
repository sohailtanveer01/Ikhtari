import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LikesProfileView from "../../../components/LikesProfileView";
import { useDiscoverStore } from "../../../lib/stores/discoverStore";
import { useInterestStore } from "../../../lib/stores/interestStore";
import { supabase } from "../../../lib/supabase";

export default function ProfileViewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const submitInterest = useInterestStore((s) => s.submitInterest);
  const respondToInterest = useInterestStore((s) => s.respondToInterest);
  const isSubmitting = useInterestStore((s) => s.isSubmitting);
  const removeProfile = useDiscoverStore((s) => s.removeProfile);

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Status of MY interest TO this profile
  const [myInterestStatus, setMyInterestStatus] = useState<string | null>(null);
  const [myInterestId, setMyInterestId] = useState<string | null>(null);
  // Incoming interest FROM this profile TO me
  const [incomingInterest, setIncomingInterest] = useState<{ id: string; status: string } | null>(null);

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

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Check if I've already sent interest to this person
          const { data: myInterest } = await supabase
            .from("interest_requests")
            .select("id, status")
            .eq("sender_id", user.id)
            .eq("recipient_id", userId)
            .maybeSingle();

          if (myInterest) {
            setMyInterestStatus(myInterest.status);
            setMyInterestId(myInterest.id);
          }

          // Check if this person has sent interest TO me (pending only)
          const { data: theirInterest } = await supabase
            .from("interest_requests")
            .select("id, status")
            .eq("sender_id", userId)
            .eq("recipient_id", user.id)
            .in("status", ["pending", "awaiting_answers", "answers_submitted"])
            .maybeSingle();

          if (theirInterest) setIncomingInterest({ id: theirInterest.id, status: theirInterest.status });
        }

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

  const handleSendInterest = async () => {
    if (!userId || isSubmitting) return;
    const result = await submitInterest(userId, []);
    if (result.success) {
      removeProfile(userId);
      setMyInterestStatus("pending");
      Alert.alert("Interest Sent!", "They'll be notified of your interest.", [{ text: "OK" }]);
    } else {
      Alert.alert("Error", result.error || "Failed to send interest. Please try again.");
    }
  };

  const handleAcceptIncoming = async () => {
    if (!incomingInterest || isSubmitting) return;
    const result = await respondToInterest(incomingInterest.id, "accept");
    if (result.success) {
      removeProfile(userId);
      if (result.awaiting_answers) {
        setIncomingInterest({ id: incomingInterest.id, status: "awaiting_answers" });
        Alert.alert(
          "Interest Accepted!",
          "They'll be notified to answer your questions.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        // No questions — match created directly
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
            otherUserName: profile.first_name || profile.name || "",
            otherUserPhoto: profile.photos?.[0] || "",
            myPhoto,
          },
        });
      }
    } else {
      Alert.alert("Error", result.error || "Failed to accept interest.");
    }
  };

  const getMyStatusBadge = () => {
    switch (myInterestStatus) {
      case "pending":
        return (
          <View className="bg-yellow-600/20 px-4 py-3 rounded-2xl items-center">
            <Text className="text-yellow-500 font-semibold">Interest Sent - Pending</Text>
          </View>
        );
      case "accepted":
      case "answered_back":
        return (
          <View className="bg-green-600/20 px-4 py-3 rounded-2xl items-center">
            <Text className="text-green-500 font-semibold">Matched! Start Chatting</Text>
          </View>
        );
      case "declined":
        return (
          <View className="bg-red-600/20 px-4 py-3 rounded-2xl items-center">
            <Text className="text-red-400 font-semibold">Not Reciprocated</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const getIncomingStatusBadge = () => {
    // Incoming interest is in a non-actionable state (shouldn't normally be shown)
    return null;
  };

  // Determine which bottom action to show
  const renderBottomAction = () => {
    // If I have a status with this profile (I sent interest), show that
    if (myInterestStatus) {
      return getMyStatusBadge();
    }

    // If they sent interest to me and it's pending, show accept button
    if (incomingInterest?.status === "pending") {
      return (
        <View className="gap-3">
          <Pressable
            className={`bg-[#B8860B] px-6 py-4 rounded-2xl items-center flex-row justify-center ${isSubmitting ? "opacity-60" : ""}`}
            style={{
              shadowColor: "#B8860B",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.45,
              shadowRadius: 12,
              elevation: 8,
            }}
            onPress={handleAcceptIncoming}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#1C1208" size="small" />
            ) : (
              <>
                <Ionicons name="heart" size={20} color="#1C1208" style={{ marginRight: 8 }} />
                <Text className="text-[#1C1208] text-lg font-bold">Accept Their Interest</Text>
              </>
            )}
          </Pressable>
        </View>
      );
    }

    // If they sent interest and it's in another state
    if (incomingInterest) {
      return getIncomingStatusBadge();
    }

    // No interest from either side — show "I'm Interested" button
    return (
      <Pressable
        className={`bg-[#B8860B] px-6 py-4 rounded-2xl items-center flex-row justify-center ${isSubmitting ? "opacity-60" : ""}`}
        style={{
          shadowColor: "#B8860B",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.45,
          shadowRadius: 12,
          elevation: 8,
        }}
        onPress={handleSendInterest}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#1C1208" size="small" />
        ) : (
          <>
            <Ionicons name="heart" size={20} color="#1C1208" style={{ marginRight: 8 }} />
            <Text className="text-[#1C1208] text-lg font-bold">I'm Interested</Text>
          </>
        )}
      </Pressable>
    );
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
        {renderBottomAction()}
      </View>

    </View>
  );
}
