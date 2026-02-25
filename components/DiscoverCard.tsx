import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useRef } from "react";
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 54) / 2;

function cleanPhotoUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  if (url.includes("localhost")) {
    const supabasePart = url.split(":http://localhost")[0];
    if (supabasePart && supabasePart.startsWith("http")) return supabasePart;
    return null;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return null;
}

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

interface DiscoverCardProps {
  profile: any;
  onPress: () => void;
  showTick?: boolean;
  playEntry?: boolean;
  entryIndex?: number;
}

export default function DiscoverCard({
  profile,
  onPress,
  showTick = false,
  playEntry = false,
  entryIndex = 0,
}: DiscoverCardProps) {
  const tickOpacity = useRef(new Animated.Value(0)).current;
  const entryTranslateY = useRef(new Animated.Value(playEntry ? 60 : 0)).current;
  const entryOpacity = useRef(new Animated.Value(playEntry ? 0 : 1)).current;

  // Play staggered spring entry when card mounts as part of a new batch
  useEffect(() => {
    if (!playEntry) return;
    const delay = entryIndex * 75;
    Animated.parallel([
      Animated.spring(entryTranslateY, {
        toValue: 0,
        delay,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 280,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showTick) {
      Animated.timing(tickOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      tickOpacity.setValue(0);
    }
  }, [showTick, tickOpacity]);

  let mainPhoto: string | null = null;
  if (profile.photos && Array.isArray(profile.photos) && profile.photos.length > 0) {
    for (const photo of profile.photos) {
      const cleaned = cleanPhotoUrl(photo);
      if (cleaned) { mainPhoto = cleaned; break; }
    }
  }

  const fullName =
    profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.name || "Unknown";

  const age = calculateAge(profile.dob);
  const city = profile.city || "";

  return (
    <Animated.View style={{
      opacity: entryOpacity,
      transform: [{ translateY: entryTranslateY }],
    }}>
    <Pressable
      className="bg-white rounded-3xl overflow-hidden"
      style={{
        width: CARD_WIDTH,
        height: CARD_WIDTH * 1.45,
        borderWidth: 1,
        borderColor: "rgba(184,134,11,0.7)",
        shadowColor: "#B8860B",
        shadowOpacity: 0.22,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      }}
      onPress={onPress}
    >
      {mainPhoto ? (
        <View style={{ width: "100%", height: "100%", position: "relative" }}>
          <Image
            source={{ uri: mainPhoto }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            priority="normal"
          />
          <View style={styles.gradient} />
          <View style={{ position: "absolute", bottom: 12, left: 12, right: 12 }}>
            <Text className="text-white text-lg font-semibold" numberOfLines={1}>
              {fullName}{age !== null ? `, ${age}` : ""}
            </Text>
            {city ? (
              <Text className="text-white/70 text-xs mt-1" numberOfLines={1}>{city}</Text>
            ) : null}
            {(profile.is_boosted || profile.compatibility_score != null) && (
              <View className="flex-row mt-2 gap-1.5">
                {profile.is_boosted && (
                  <View className="px-2.5 py-1 rounded-full bg-[#B8860B]/30">
                    <Text className="text-[11px] text-[#B8860B] font-semibold">Boosted</Text>
                  </View>
                )}
                {profile.compatibility_score != null && (
                  <View className="px-2.5 py-1 rounded-full bg-[#B8860B]/30">
                    <Text className="text-[11px] text-[#B8860B] font-semibold">
                      {profile.compatibility_score}% Compatible
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      ) : (
        <View className="w-full h-full bg-[#F5F0E8] items-center justify-center" style={{ position: "relative" }}>
          <Text className="text-white/60 text-4xl">👤</Text>
          <View style={styles.gradient} />
          <View style={{ position: "absolute", bottom: 12, left: 12, right: 12 }}>
            <Text className="text-white text-lg font-semibold" numberOfLines={1}>
              {fullName}{age !== null ? `, ${age}` : ""}
            </Text>
          </View>
        </View>
      )}

      {/* Green tick overlay */}
      <Animated.View
        style={[styles.tickOverlay, { opacity: tickOpacity }]}
        pointerEvents="none"
      >
        <View style={styles.tickCircle}>
          <Ionicons name="checkmark" size={40} color="#fff" />
        </View>
      </Animated.View>
    </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  tickOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(34, 197, 94, 0.75)",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tickCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(22, 163, 74, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
});
