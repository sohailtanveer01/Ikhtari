import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { MarriageFoundationsBadge } from "./MarriageFoundationsBadge";

const { width, height } = Dimensions.get("window");

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

interface SwipeCardProps {
  profile: any;
  onTap?: () => void;
}

export default function SwipeCard({ profile, onTap }: SwipeCardProps) {
  const photos = profile?.photos || [];
  const mainPhoto = photos.length > 0 ? photos[0] : null;

  const firstName = profile?.first_name || profile?.name?.split(" ")[0] || "Unknown";
  const age = calculateAge(profile?.dob);

  const city = profile?.city || "";
  const country = profile?.country || "";
  const location = [city, country].filter(Boolean).join(", ");

  const rawScore = profile?.compatibility_score;
  const compatibilityScore = rawScore != null ? Math.round(rawScore * 100) : null;

  const isOnline = profile?.is_online ?? false;

  return (
    <View style={styles.container}>
      {mainPhoto ? (
        <Pressable onPress={onTap} style={styles.imageContainer} disabled={!onTap}>
          <Image
            source={{ uri: mainPhoto }}
            style={styles.image}
            contentFit="cover"
            transition={0}
            cachePolicy="memory-disk"
            priority="high"
            placeholderContentFit="cover"
            placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
            blurRadius={profile?.blur_photos && !profile?.is_liked_by_them ? 50 : 0}
          />
        </Pressable>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>👤</Text>
        </View>
      )}

      {/* Bottom gradient overlay */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.28)", "rgba(0,0,0,0.78)"]}
        style={styles.gradient}
        pointerEvents="none"
      />

      {/* Top badges row */}
      <View style={styles.topRow} pointerEvents="none">
        {isOnline ? (
          <View style={styles.onlineBadge}>
            <Text style={styles.onlineBadgeText}>Online</Text>
          </View>
        ) : (
          <View />
        )}
        {compatibilityScore !== null && (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreBadgeText}>{compatibilityScore}%</Text>
          </View>
        )}
      </View>

      {/* Bottom info — left aligned */}
      <View style={styles.infoContainer} pointerEvents="none">
        <View style={styles.nameRow}>
          <Text style={styles.nameText}>
            {firstName}{age !== null ? `, ${age}` : ""}
          </Text>
          {profile?.is_certified && profile?.show_badge && (
            <MarriageFoundationsBadge size="small" showText={false} />
          )}
        </View>

        {!!location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={15} color="rgba(255,255,255,0.85)" />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        )}

        {profile?.is_liked_by_them && (
          <View style={styles.likedBadge}>
            <Text style={styles.likedBadgeText}>Liked you</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: "#F5F0E8",
    position: "relative",
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F5F0E8",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 80,
    opacity: 0.5,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.42,
  },
  topRow: {
    position: "absolute",
    top: 56,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  onlineBadge: {
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  onlineBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  scoreBadge: {
    backgroundColor: "#C9980A",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  scoreBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  infoContainer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 200,
    alignItems: "flex-start",
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameText: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.88)",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  likedBadge: {
    backgroundColor: "#B8860B",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  likedBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
