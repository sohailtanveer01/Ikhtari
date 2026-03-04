import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { formatLastActive } from "../lib/utils/timeUtils";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 32) / 2;

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

  const firstName = profile.first_name || profile.name?.split(" ")[0] || "Unknown";
  const age = calculateAge(profile.dob);
  const city = profile.city || "";
  const country = profile.country || "";
  const location = [city, country].filter(Boolean).join(", ");

  const activeInfo = formatLastActive(profile.last_active_at);
  const isOnline = activeInfo?.dotColor === "#22C55E" || activeInfo?.label?.toLowerCase() === "online";

  const rawScore = profile.compatibility_score;
  const compatibilityScore = rawScore != null
    ? (rawScore > 1 ? Math.round(rawScore) : Math.round(rawScore * 100))
    : null;

  return (
    <Animated.View style={{
      opacity: entryOpacity,
      transform: [{ translateY: entryTranslateY }],
    }}>
      <Pressable
        style={styles.card}
        onPress={onPress}
      >
        {mainPhoto ? (
          <Image
            source={{ uri: mainPhoto }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            priority="normal"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
        )}

        {/* Bottom gradient */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.25)", "rgba(0,0,0,0.72)"]}
          style={styles.gradient}
          pointerEvents="none"
        />

        {/* Top row — Online + Compatibility */}
        <View style={styles.topRow}>
          {isOnline ? (
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineBadgeText}>Online</Text>
            </View>
          ) : <View />}
          {compatibilityScore !== null && (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeText}>{compatibilityScore}%</Text>
            </View>
          )}
        </View>

        {/* Bottom info */}
        <View style={styles.infoContainer}>
          <Text style={styles.nameText} numberOfLines={1}>
            {firstName}{age !== null ? `, ${age}` : ""}
          </Text>
          {!!location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.85)" />
              <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
            </View>
          )}
          {!!profile.is_interested_in_me && (
            <View style={styles.likedBadge}>
              <Text style={styles.likedBadgeText}>Liked you</Text>
            </View>
          )}
        </View>

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
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.65,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#F5F0E8",
    borderWidth: 1,
    borderColor: "rgba(184,134,11,0.7)",
    shadowColor: "#B8860B",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  placeholder: {
    backgroundColor: "#F5F0E8",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55%",
  },
  topRow: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  onlineBadge: {
    backgroundColor: "rgba(0,0,0,0.42)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  onlineBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  scoreBadge: {
    backgroundColor: "#C9980A",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  infoContainer: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    gap: 3,
  },
  nameText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  locationText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
    fontWeight: "500",
  },
  likedBadge: {
    backgroundColor: "#B8860B",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    alignSelf: "flex-start",
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  likedBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tickOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(34, 197, 94, 0.75)",
    borderRadius: 20,
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
