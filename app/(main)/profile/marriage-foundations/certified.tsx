import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
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

  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.6);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 90 });
    opacity.value = withTiming(1, { duration: 500 });

    ring1Scale.value = withDelay(
      400,
      withRepeat(withTiming(1.7, { duration: 1800 }), -1, false)
    );
    ring1Opacity.value = withDelay(
      400,
      withRepeat(withTiming(0, { duration: 1800 }), -1, false)
    );
    ring2Scale.value = withDelay(
      900,
      withRepeat(withTiming(2.1, { duration: 2200 }), -1, false)
    );
    ring2Opacity.value = withDelay(
      900,
      withRepeat(withTiming(0, { duration: 2200 }), -1, false)
    );
  }, []);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const certifiedDate = certification?.certified_at
    ? new Date(certification.certified_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 120,
          alignItems: "center",
          paddingTop: 32,
        }}
      >
        {/* Trophy with pulsing rings */}
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            width: 200, height: 200,
            marginBottom: 28,
          }}
        >
          <Animated.View
            style={[
              {
                position: "absolute",
                width: 120, height: 120, borderRadius: 60,
                borderWidth: 2, borderColor: "rgba(184,134,11,0.5)",
              },
              ring1Style,
            ]}
          />
          <Animated.View
            style={[
              {
                position: "absolute",
                width: 120, height: 120, borderRadius: 60,
                borderWidth: 1.5, borderColor: "rgba(184,134,11,0.3)",
              },
              ring2Style,
            ]}
          />

          <Animated.View style={badgeStyle}>
            <LinearGradient
              colors={["#D4A017", "#B8860B", "#8A6608"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 120, height: 120, borderRadius: 60,
                alignItems: "center", justifyContent: "center",
                shadowColor: "#B8860B",
                shadowOpacity: 0.55,
                shadowRadius: 28,
                shadowOffset: { width: 0, height: 10 },
                elevation: 16,
              }}
            >
              <Ionicons name="ribbon" size={58} color="#FFE680" />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Text block */}
        <Text
          style={{
            color: "#9E8E7E", fontSize: 11, fontWeight: "700",
            letterSpacing: 3, textTransform: "uppercase", marginBottom: 10,
          }}
        >
          Masha'Allah
        </Text>
        <Text
          style={{
            color: "#1C1208", fontSize: 32, fontWeight: "900",
            textAlign: "center", marginBottom: 8,
            letterSpacing: -0.5, paddingHorizontal: 24,
          }}
        >
          Congratulations!
        </Text>
        <Text
          style={{
            color: "#B8860B", fontSize: 16, fontWeight: "700",
            textAlign: "center", marginBottom: 6,
          }}
        >
          Marriage Foundations Certified
        </Text>
        {certifiedDate && (
          <Text
            style={{
              color: "#9E8E7E", fontSize: 13,
              textAlign: "center", marginBottom: 32,
            }}
          >
            Certified on {certifiedDate}
          </Text>
        )}

        {/* Certificate card */}
        <View style={{ width: "100%", paddingHorizontal: 20, marginBottom: 28 }}>
          <LinearGradient
            colors={[
              "rgba(212,160,23,0.45)",
              "rgba(184,134,11,0.18)",
              "rgba(150,112,10,0.45)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24, padding: 1.5 }}
          >
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 22.5,
                padding: 24,
                alignItems: "center",
              }}
            >
              {/* Decorative top */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 18,
                  gap: 8,
                }}
              >
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(184,134,11,0.2)" }} />
                <Ionicons name="star" size={12} color="rgba(184,134,11,0.4)" />
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(184,134,11,0.2)" }} />
              </View>

              <MarriageFoundationsBadge size="large" showText={true} />

              <View
                style={{
                  height: 1, backgroundColor: "rgba(184,134,11,0.15)",
                  width: "100%", marginVertical: 18,
                }}
              />
              <Text
                style={{
                  color: "#6B5D4F", fontSize: 14,
                  textAlign: "center", lineHeight: 22,
                }}
              >
                You've completed all modules and demonstrated your understanding
                of Islamic marriage values and responsibilities.
              </Text>
              <View
                style={{
                  height: 1, backgroundColor: "rgba(184,134,11,0.15)",
                  width: "100%", marginVertical: 18,
                }}
              />
              <Text
                style={{
                  color: "#B8860B", fontSize: 12, fontWeight: "700",
                  textAlign: "center", letterSpacing: 0.4,
                }}
              >
                This badge is now visible on your profile ✦
              </Text>

              {/* Decorative bottom */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 18,
                  gap: 8,
                }}
              >
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(184,134,11,0.2)" }} />
                <Ionicons name="star" size={12} color="rgba(184,134,11,0.4)" />
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(184,134,11,0.2)" }} />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Buttons */}
        <View style={{ width: "100%", paddingHorizontal: 20, gap: 12 }}>
          <Pressable
            onPress={() => router.push("/(main)/profile")}
            style={({ pressed }) => ({
              borderRadius: 999,
              shadowColor: "#B8860B",
              shadowOpacity: pressed ? 0.3 : 0.55,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 12,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <LinearGradient
              colors={["#E8B820", "#C9980A", "#A87A08"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 18, borderRadius: 999,
                alignItems: "center",
                borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 }}>
                View My Profile
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(main)/profile/marriage-foundations")}
            style={({ pressed }) => ({
              paddingVertical: 17,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: "rgba(184,134,11,0.32)",
              alignItems: "center",
              backgroundColor: pressed ? "rgba(184,134,11,0.06)" : "transparent",
            })}
          >
            <Text style={{ color: "#B8860B", fontSize: 15, fontWeight: "700" }}>
              Back to Course
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
