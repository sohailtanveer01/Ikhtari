import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MarriageFoundationsBadge } from "@/components/MarriageFoundationsBadge";
import { useCertification } from "@/lib/hooks/useCertification";

export default function CertificationSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: certification } = useCertification();

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Celebration animation
    scale.value = withRepeat(
      withSpring(1.2, { damping: 8, stiffness: 100 }),
      3,
      true
    );
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000 }),
      1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const certifiedDate = certification?.certified_at
    ? new Date(certification.certified_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <View
      style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}
      className="flex-1 items-center justify-center px-6"
    >
      {/* Celebration Icon */}
      <Animated.View style={animatedStyle} className="mb-6">
        <View className="w-32 h-32 rounded-full bg-[#B8860B]/20 items-center justify-center">
          <Ionicons name="trophy" size={64} color="#B8860B" />
        </View>
      </Animated.View>

      {/* Success Message */}
      <Text className="text-[#1C1208] text-3xl font-bold text-center mb-4">
        Congratulations!
      </Text>
      <Text className="text-[#1C1208] text-xl text-center mb-2">
        You are now
      </Text>
      <Text className="text-[#B8860B] text-2xl font-bold text-center mb-6">
        Marriage Foundations Certified
      </Text>

      {/* Badge Preview */}
      <View className="mb-6">
        <MarriageFoundationsBadge size="large" showText={true} />
      </View>

      {/* Certification Date */}
      {certifiedDate && (
        <Text className="text-[#6B5D4F] text-base text-center mb-8">
          Certified on {certifiedDate}
        </Text>
      )}

      {/* Description */}
      <View className="bg-white rounded-2xl p-6 mb-8">
        <Text className="text-[#1C1208] text-base text-center leading-6">
          You've completed all modules and demonstrated your understanding of
          Islamic marriage values and responsibilities. This certification badge
          will be visible on your profile, helping others see that you're serious
          about marriage and understand its importance in Islam.
        </Text>
      </View>

      {/* Action Buttons */}
      <View className="w-full">
        <Pressable
          onPress={() => router.push("/(main)/profile")}
          className="bg-[#B8860B] rounded-xl py-4 px-6 mb-3"
        >
          <Text className="text-black text-center font-bold text-base">
            View My Profile
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(main)/profile/marriage-foundations")}
          className="bg-[#F5F0E8] rounded-xl py-4 px-6"
        >
          <Text className="text-[#6B5D4F] text-center font-semibold text-base">
            Back to Course
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

