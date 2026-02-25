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
  onTap?: () => void; // Called when user taps on the card (opens modal)
}

/**
 * Minimal image-first swipe card.
 * Shows only the main photo with a subtle gradient + name/age overlay.
 * - Tap to open profile details modal (via onTap prop)
 * - Swipe up to open profile details modal (handled in parent gesture)
 */
export default function SwipeCard({ profile, onTap }: SwipeCardProps) {
  const photos = profile?.photos || [];
  const mainPhoto = photos.length > 0 ? photos[0] : null;

  const fullName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile?.name || "Unknown";

  const age = calculateAge(profile?.dob);
  const profession = profile?.profession || "";

  return (
    <View style={styles.container}>
      {mainPhoto ? (
        <Pressable
          onPress={onTap}
          style={styles.imageContainer}
          disabled={!onTap}
        >
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

      {/* Subtle gradient at bottom for readability */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.7)"]}
        style={styles.gradient}
        pointerEvents="none"
      />

      {/* Name, Age, and optional profession */}
      <View style={styles.infoContainer} pointerEvents="none">
        <View style={styles.nameContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>
              {fullName}
              {age !== null ? `, ${age}` : ""}
            </Text>
            {profile?.is_certified && profile?.show_badge && (
              <View style={styles.badgeContainer}>
                <MarriageFoundationsBadge size="small" showText={false} />
              </View>
            )}
          </View>
          {profile?.is_liked_by_them && (
            <View style={styles.likedBadge}>
              <Text style={styles.likedBadgeText}>Liked you</Text>
            </View>
          )}
        </View>
        {!!profession && (
          <Text style={styles.subText} numberOfLines={1}>
            {profession}
          </Text>
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
    height: height * 0.35,
  },
  infoContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 220, // Slightly above the action buttons (avoid overlap)
    paddingHorizontal: 24,
    alignItems: "center",
  },
  nameText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subText: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  nameContainer: {
    alignItems: "center",
    gap: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeContainer: {
    marginLeft: 4,
  },
  likedBadge: {
    backgroundColor: "#B8860B",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  likedBadgeText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
