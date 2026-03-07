import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface Event {
  id: string;
  title: string;
  description?: string;
  location_name: string;
  city?: string;
  event_date: string;
  ticket_price: number;
  ticket_currency?: string;
  cover_image_url?: string;
  tags?: string[];
  distance_miles?: number | null;
  user_has_ticket?: boolean;
}

interface EventCardProps {
  event: Event;
  onPress: () => void;
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const day = days[date.getDay()];
  const month = months[date.getMonth()];
  const dateNum = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  const minStr = minutes === 0 ? "00" : minutes.toString().padStart(2, "0");
  return `${day}, ${dateNum} ${month} · ${hour12}:${minStr} ${ampm}`;
}

export default function EventCard({ event, onPress }: EventCardProps) {
  const locationLabel =
    event.distance_miles != null
      ? `${event.distance_miles} mi away`
      : event.city || event.location_name;

  return (
    <Pressable onPress={onPress} style={styles.container}>
      {/* Cover image or gradient fallback */}
      {event.cover_image_url ? (
        <Image
          source={{ uri: event.cover_image_url }}
          style={styles.coverImage}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : (
        <LinearGradient
          colors={["#1a1a2e", "#16213e", "#0f3460"]}
          style={styles.coverImage}
        >
          <Text style={styles.fallbackTitle} numberOfLines={3}>
            {event.title}
          </Text>
        </LinearGradient>
      )}

      {/* Gradient overlay at bottom */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        style={styles.gradient}
        pointerEvents="none"
      />

      {/* Free badge */}
      <View style={styles.priceBadge}>
        <Text style={styles.priceText}>Free</Text>
      </View>

      {/* Attending badge */}
      {event.user_has_ticket && (
        <View style={styles.attendingBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={styles.attendingText}>Attending</Text>
        </View>
      )}

      {/* Info overlay */}
      <View style={styles.infoContainer} pointerEvents="none">
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" />
          <Text style={styles.metaText}>{formatEventDate(event.event_date)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
          <Text style={styles.metaText} numberOfLines={1}>
            {event.location_name}
            {locationLabel !== event.location_name ? `  ·  ${locationLabel}` : ""}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    height: 220,
    position: "relative",
    shadowColor: "#B8860B",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  coverImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
  },
  priceBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(184,134,11,0.18)",
    borderWidth: 1,
    borderColor: "#B8860B",
  },
  priceText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B8860B",
  },
  attendingBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16,185,129,0.15)",
    borderWidth: 1,
    borderColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  attendingText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "700",
  },
  infoContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 4,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    flex: 1,
  },
});
