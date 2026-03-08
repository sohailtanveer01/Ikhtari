import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
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

  const photoLeftX = useSharedValue(-SCREEN_WIDTH);
  const photoRightX = useSharedValue(SCREEN_WIDTH);
  const badgeScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(24);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(30);

  useEffect(() => {
    photoLeftX.value = withDelay(100, withSpring(0, { damping: 14, stiffness: 90 }));
    photoRightX.value = withDelay(100, withSpring(0, { damping: 14, stiffness: 90 }));

    badgeScale.value = withDelay(380, withSpring(1, { damping: 8, stiffness: 130 }));

    textOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
    textTranslateY.value = withDelay(500, withSpring(0, { damping: 12, stiffness: 100 }));

    buttonsOpacity.value = withDelay(750, withTiming(1, { duration: 500 }));
    buttonsTranslateY.value = withDelay(750, withSpring(0, { damping: 12, stiffness: 100 }));
  }, []);

  const photoLeftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: photoLeftX.value }],
  }));

  const photoRightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: photoRightX.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FDFAF5",
        paddingTop: insets.top,
        paddingBottom: insets.bottom + 16,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
      }}
    >
      {/* Profile cards with logo connector */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 40,
        }}
      >
        {/* Left card — my photo */}
        <Animated.View style={photoLeftStyle}>
          <View
            style={{
              width: 140,
              height: 190,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: "#B8860B",
              overflow: "hidden",
              backgroundColor: "#F5F0E8",
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
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="person" size={48} color="#9CA3AF" />
              </View>
            )}
          </View>
        </Animated.View>

        {/* Logo connector bubble */}
        <Animated.View style={[badgeStyle, { marginHorizontal: -20, zIndex: 10 }]}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "#FDFAF5",
              borderWidth: 1.5,
              borderColor: "#EDE5D5",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#B8860B",
              shadowOpacity: 0.18,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 2 },
              elevation: 5,
            }}
          >
            <Image
              source={require("../../assets/Logos/transparent-logo.png")}
              style={{ width: 58, height: 58 }}
              contentFit="contain"
            />
          </View>
        </Animated.View>

        {/* Right card — other user's photo */}
        <Animated.View style={photoRightStyle}>
          <View
            style={{
              width: 140,
              height: 190,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: "#B8860B",
              overflow: "hidden",
              backgroundColor: "#F5F0E8",
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
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="person" size={48} color="#9CA3AF" />
              </View>
            )}
          </View>
        </Animated.View>
      </View>

      {/* Text */}
      <Animated.View style={[textStyle, { alignItems: "center", marginBottom: 40, paddingHorizontal: 8 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <View style={{ height: 1, width: 32, backgroundColor: "#B8860B", opacity: 0.4 }} />
          <Text style={{ color: "#B8860B", fontSize: 11, letterSpacing: 2.5, opacity: 0.7 }}>
            ALHAMDULILLAH
          </Text>
          <View style={{ height: 1, width: 32, backgroundColor: "#B8860B", opacity: 0.4 }} />
        </View>

        <Text
          style={{
            color: "#1C1208",
            fontSize: 34,
            fontWeight: "700",
            textAlign: "center",
            marginBottom: 10,
            letterSpacing: -0.5,
          }}
        >
          It's a Match!
        </Text>
        <Text
          style={{
            color: "#9E8E7E",
            fontSize: 15,
            textAlign: "center",
            lineHeight: 22,
          }}
        >
          You and{" "}
          <Text style={{ color: "#B8860B", fontWeight: "600" }}>
            {otherUserName || "your match"}
          </Text>{" "}
          have both shown interest.{"\n"}Start the conversation.
        </Text>
      </Animated.View>

      {/* Buttons */}
      <Animated.View style={[buttonsStyle, { width: "100%" }]}>
        <Pressable
          onPress={() => {
            if (matchId) {
              router.replace(`/(main)/chat/${matchId}`);
            } else {
              router.back();
            }
          }}
          style={{
            backgroundColor: "#B8860B",
            borderRadius: 16,
            paddingVertical: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
            gap: 8,
          }}
        >
          <Ionicons name="chatbubble" size={18} color="#FDFAF5" />
          <Text style={{ color: "#FDFAF5", fontSize: 16, fontWeight: "700" }}>
            Send a Message
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={{
            backgroundColor: "#F5F0E8",
            borderRadius: 16,
            paddingVertical: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#EDE5D5",
            gap: 8,
          }}
        >
          <Ionicons name="compass-outline" size={18} color="#6B5D4F" />
          <Text style={{ color: "#6B5D4F", fontSize: 16, fontWeight: "600" }}>
            Keep Browsing
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
