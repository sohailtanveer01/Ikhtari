import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function MatchCelebrationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { matchId, otherUserName, otherUserPhoto, myPhoto } =
    useLocalSearchParams<{
      matchId: string;
      otherUserName: string;
      otherUserPhoto: string;
      myPhoto: string;
    }>();

  // Animated values
  const heartScale = useSharedValue(0);
  const heartGlow = useSharedValue(0.3);
  const photoLeftX = useSharedValue(-SCREEN_WIDTH);
  const photoRightX = useSharedValue(SCREEN_WIDTH);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(30);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);

  useEffect(() => {
    // Logo fades in first
    logoOpacity.value = withDelay(100, withTiming(1, { duration: 600 }));
    logoScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 100 }));

    // Heart pops in with spring
    heartScale.value = withDelay(
      300,
      withSpring(1, { damping: 8, stiffness: 120 })
    );

    // Heart glow pulses continuously
    heartGlow.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );

    // Photos slide in from sides
    photoLeftX.value = withDelay(
      200,
      withSpring(0, { damping: 14, stiffness: 90 })
    );
    photoRightX.value = withDelay(
      200,
      withSpring(0, { damping: 14, stiffness: 90 })
    );

    // Text fades up
    textOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    textTranslateY.value = withDelay(
      600,
      withSpring(0, { damping: 12, stiffness: 100 })
    );

    // Buttons fade up last
    buttonsOpacity.value = withDelay(900, withTiming(1, { duration: 500 }));
    buttonsTranslateY.value = withDelay(
      900,
      withSpring(0, { damping: 12, stiffness: 100 })
    );
  }, []);

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const heartGlowStyle = useAnimatedStyle(() => ({
    opacity: heartGlow.value,
  }));

  const photoLeftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: photoLeftX.value }],
  }));

  const photoRightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: photoRightX.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <View
      style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}
      className="flex-1 items-center justify-center px-6"
    >
      {/* App Logo at top */}
      <Animated.View style={logoStyle} className="mb-4">
        <Image
          source={require("../../assets/Logos/colored-logo-without-brand.png")}
          style={{ width: 80, height: 80 }}
          contentFit="contain"
        />
      </Animated.View>

      {/* Animated Heart with Glow */}
      <Animated.View style={heartAnimatedStyle} className="mb-6 items-center justify-center">
        {/* Glow ring behind */}
        <Animated.View
          style={[
            heartGlowStyle,
            {
              position: "absolute",
              width: 110,
              height: 110,
              borderRadius: 55,
              backgroundColor: "#B8860B",
            },
          ]}
        />
        <View className="w-24 h-24 rounded-full bg-[#F5F0E8] items-center justify-center border-2 border-[#B8860B]/60">
          <Ionicons name="heart" size={48} color="#B8860B" />
        </View>
      </Animated.View>

      {/* Profile Photos */}
      <View className="flex-row items-center justify-center mb-8">
        {/* My Photo */}
        <Animated.View style={photoLeftStyle}>
          <View
            style={{
              width: 112,
              height: 112,
              borderRadius: 56,
              borderWidth: 3,
              borderColor: "#B8860B",
              overflow: "hidden",
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
          >
            {myPhoto ? (
              <Image
                source={{ uri: myPhoto }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="person" size={40} color="#9CA3AF" />
              </View>
            )}
          </View>
        </Animated.View>

        {/* Heart connector badge */}
        <Animated.View
          style={[
            heartAnimatedStyle,
            {
              marginHorizontal: -14,
              zIndex: 10,
            },
          ]}
        >
          <View className="w-11 h-11 rounded-full bg-[#B8860B] items-center justify-center border-2 border-black">
            <Ionicons name="heart" size={20} color="#FFFFFF" />
          </View>
        </Animated.View>

        {/* Other User Photo */}
        <Animated.View style={photoRightStyle}>
          <View
            style={{
              width: 112,
              height: 112,
              borderRadius: 56,
              borderWidth: 3,
              borderColor: "#B8860B",
              overflow: "hidden",
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
          >
            {otherUserPhoto ? (
              <Image
                source={{ uri: otherUserPhoto }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="person" size={40} color="#9CA3AF" />
              </View>
            )}
          </View>
        </Animated.View>
      </View>

      {/* Heading */}
      <Animated.View style={textStyle} className="items-center">
        <Text className="text-[#B8860B] text-4xl font-bold text-center mb-2">
          It's a Match!
        </Text>
        <Text className="text-[#9E8E7E] text-base text-center leading-6">
          You and {otherUserName || "your match"} can now start chatting
        </Text>
      </Animated.View>

      {/* Buttons */}
      <Animated.View style={buttonsStyle} className="w-full mt-10">
        <Pressable
          onPress={() => {
            if (matchId) {
              router.replace(`/(main)/chat/${matchId}`);
            } else {
              router.back();
            }
          }}
          className="bg-[#B8860B] rounded-2xl py-4 px-6 mb-3 items-center flex-row justify-center"
        >
          <Ionicons name="chatbubble" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text className="text-[#1C1208] text-lg font-bold">Send a Message</Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          className="bg-[#F5F0E8] rounded-2xl py-4 px-6 items-center flex-row justify-center border border-[#EDE5D5]"
        >
          <Ionicons name="compass-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text className="text-[#6B5D4F] text-lg font-semibold">
            Keep Browsing
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
