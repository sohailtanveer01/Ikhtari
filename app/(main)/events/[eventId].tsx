import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";

interface Event {
  id: string;
  title: string;
  description?: string;
  location_name: string;
  address?: string;
  city?: string;
  country?: string;
  event_date: string;
  end_date?: string;
  ticket_price: number;
  ticket_currency?: string;
  max_capacity?: number;
  tickets_sold?: number;
  cover_image_url?: string;
  organizer_name?: string;
  tags?: string[];
  lat?: number | null;
  lon?: number | null;
}

interface Ticket {
  ticket_code: string;
  status: string;
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatEventTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [event, setEvent] = useState<Event | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [successTicketCode, setSuccessTicketCode] = useState("");

  useEffect(() => {
    if (!eventId) return;
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const [eventRes, ticketRes] = await Promise.all([
        supabase.from("events").select("*").eq("id", eventId).single(),
        user
          ? supabase
              .from("event_tickets")
              .select("ticket_code, status")
              .eq("event_id", eventId)
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (eventRes.data) setEvent(eventRes.data);
      if (ticketRes.data) setTicket(ticketRes.data);
    } catch (e) {
      console.error("loadEvent error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    if (!event) return;
    Alert.alert(
      "Confirm Registration",
      `Register for "${event.title}"?\n\nThis event is free to attend.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Register", onPress: purchaseTicket },
      ]
    );
  };

  const purchaseTicket = async () => {
    if (!event) return;
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-event-ticket", {
        body: { event_id: event.id },
      });

      if (error) {
        Alert.alert("Error", error.message || "Failed to register");
        return;
      }

      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (parsed?.success) {
        setSuccessTicketCode(parsed.ticket_code);
        setSuccessModal(true);
        setTicket({ ticket_code: parsed.ticket_code, status: "confirmed" });
      } else {
        Alert.alert("Error", parsed?.error || "Failed to register");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Something went wrong");
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Event not found</Text>
        <Pressable onPress={() => router.back()} style={styles.goBackBtn}>
          <Text style={styles.goBackBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const hasTicket = ticket?.status === "confirmed";
  const hasLocation = event.lat != null && event.lon != null;
  const spotsLeft = event.max_capacity != null
    ? event.max_capacity - (event.tickets_sold || 0)
    : null;
  const timeRange = event.end_date
    ? `${formatEventTime(event.event_date)} – ${formatEventTime(event.end_date)}`
    : formatEventTime(event.event_date);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#FFF2B8", "#FDF8EE", "#FDFAF5"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroContainer}>
          {event.cover_image_url ? (
            <Image
              source={{ uri: event.cover_image_url }}
              style={styles.heroImage}
              contentFit="cover"
              transition={300}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.heroImage, styles.heroFallback]}>
              <Ionicons name="calendar" size={64} color="rgba(28,18,8,0.15)" />
            </View>
          )}

          {/* Dark gradient over image bottom */}
          <LinearGradient
            colors={["transparent", "rgba(28,18,8,0.72)"]}
            style={styles.heroGradient}
          />

          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            style={[styles.backOverlay, { top: insets.top + 8 }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </Pressable>

          {/* Free badge */}
          <View style={[styles.freeBadge, { top: insets.top + 8 }]}>
            <Ionicons name="gift-outline" size={13} color="#B8860B" />
            <Text style={styles.freeBadgeText}>Free</Text>
          </View>

          {/* Title overlay on hero */}
          <View style={styles.heroTitleContainer}>
            <Text style={styles.heroTitle} numberOfLines={2}>{event.title}</Text>
            {event.city && (
              <View style={styles.heroCityRow}>
                <Ionicons name="location" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={styles.heroCityText}>
                  {event.city}{event.country ? `, ${event.country}` : ""}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>

          {/* Date & Time card */}
          <View style={styles.card}>
            <View style={styles.cardIconRow}>
              <View style={[styles.cardIcon, { backgroundColor: "rgba(184,134,11,0.12)" }]}>
                <Ionicons name="calendar" size={22} color="#B8860B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabel}>Date & Time</Text>
                <Text style={styles.cardValue}>{formatEventDate(event.event_date)}</Text>
                <Text style={styles.cardSub}>{timeRange}</Text>
              </View>
            </View>
          </View>

          {/* Location card */}
          <View style={styles.card}>
            <View style={styles.cardIconRow}>
              <View style={[styles.cardIcon, { backgroundColor: "rgba(184,134,11,0.12)" }]}>
                <Ionicons name="location" size={22} color="#B8860B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabel}>Venue</Text>
                <Text style={styles.cardValue}>{event.location_name}</Text>
                {event.address && <Text style={styles.cardSub}>{event.address}</Text>}
              </View>
            </View>
          </View>

          {/* Organizer + Capacity row */}
          <View style={styles.rowCards}>
            {event.organizer_name && (
              <View style={[styles.card, styles.halfCard]}>
                <View style={[styles.cardIcon, { backgroundColor: "rgba(184,134,11,0.12)", marginBottom: 8 }]}>
                  <Ionicons name="person" size={20} color="#B8860B" />
                </View>
                <Text style={styles.cardLabel}>Organiser</Text>
                <Text style={styles.cardValueSmall}>{event.organizer_name}</Text>
              </View>
            )}
            {spotsLeft !== null && (
              <View style={[styles.card, styles.halfCard]}>
                <View style={[styles.cardIcon, { backgroundColor: spotsLeft <= 0 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", marginBottom: 8 }]}>
                  <Ionicons
                    name="people"
                    size={20}
                    color={spotsLeft <= 0 ? "#EF4444" : "#10B981"}
                  />
                </View>
                <Text style={styles.cardLabel}>Capacity</Text>
                <Text style={[styles.cardValueSmall, { color: spotsLeft <= 0 ? "#EF4444" : "#10B981" }]}>
                  {spotsLeft <= 0 ? "Sold out" : `${spotsLeft} spots left`}
                </Text>
              </View>
            )}
          </View>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {event.tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* About section */}
          {event.description && (
            <View style={styles.aboutCard}>
              <Text style={styles.sectionLabel}>About this event</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>
          )}

          {/* Map */}
          {hasLocation && (
            <View style={styles.mapCard}>
              <Text style={styles.sectionLabel}>Location on map</Text>
              <MapView
                style={styles.map}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                initialRegion={{
                  latitude: event.lat!,
                  longitude: event.lon!,
                  latitudeDelta: 0.018,
                  longitudeDelta: 0.018,
                }}
              >
                <Marker
                  coordinate={{ latitude: event.lat!, longitude: event.lon! }}
                  pinColor="#B8860B"
                />
              </MapView>
              {event.address && (
                <View style={styles.mapAddressRow}>
                  <Ionicons name="navigate-outline" size={14} color="#9E8E7E" />
                  <Text style={styles.mapAddressText}>{event.address}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        {hasTicket ? (
          <View style={styles.attendingButton}>
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            <Text style={styles.attendingText}>You're Registered</Text>
          </View>
        ) : (
          <Pressable
            onPress={handleRegister}
            style={[styles.registerButton, (purchasing || (spotsLeft !== null && spotsLeft <= 0)) && styles.buttonDisabled]}
            disabled={purchasing || (spotsLeft !== null && spotsLeft <= 0)}
          >
            {purchasing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="ticket-outline" size={20} color="#FFF" />
                <Text style={styles.registerButtonText}>
                  {spotsLeft !== null && spotsLeft <= 0 ? "Sold Out" : "Register — Free"}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* Success Modal */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="checkmark" size={36} color="#10B981" />
            </View>
            <Text style={styles.modalTitle}>You're Registered!</Text>
            <Text style={styles.modalSub}>Your ticket code</Text>
            <View style={styles.ticketCodeBox}>
              <Text style={styles.ticketCode}>{successTicketCode}</Text>
            </View>
            <Text style={styles.modalNote}>Show this code at the event entrance.</Text>
            <Pressable onPress={() => setSuccessModal(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFAF5",
  },
  centered: {
    flex: 1,
    backgroundColor: "#FDFAF5",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    color: "#1C1208",
    fontSize: 16,
  },
  goBackBtn: {
    backgroundColor: "#B8860B",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  goBackBtnText: {
    color: "#FFF",
    fontWeight: "700",
  },

  // Hero
  heroContainer: {
    height: 300,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroFallback: {
    backgroundColor: "#F5F0E8",
    alignItems: "center",
    justifyContent: "center",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  backOverlay: {
    position: "absolute",
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  freeBadge: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,242,184,0.95)",
    borderWidth: 1,
    borderColor: "#B8860B",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  freeBadgeText: {
    color: "#B8860B",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitleContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 18,
    gap: 4,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  heroCityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroCityText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
  },

  // Content
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EDE5D5",
  },
  cardIconRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardLabel: {
    color: "#9E8E7E",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  cardValue: {
    color: "#1C1208",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  cardValueSmall: {
    color: "#1C1208",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  cardSub: {
    color: "#9E8E7E",
    fontSize: 13,
    marginTop: 3,
  },
  rowCards: {
    flexDirection: "row",
    gap: 12,
  },
  halfCard: {
    flex: 1,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    backgroundColor: "rgba(184,134,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(184,134,11,0.35)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: {
    color: "#B8860B",
    fontSize: 12,
    fontWeight: "600",
  },
  aboutCard: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EDE5D5",
    gap: 8,
  },
  sectionLabel: {
    color: "#9E8E7E",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  description: {
    color: "#4B3D2E",
    fontSize: 14,
    lineHeight: 22,
  },
  mapCard: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EDE5D5",
    gap: 0,
  },
  map: {
    width: "100%",
    height: 220,
  },
  mapAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#EDE5D5",
  },
  mapAddressText: {
    color: "#9E8E7E",
    fontSize: 12,
    flex: 1,
  },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(253,250,245,0.97)",
    borderTopWidth: 1,
    borderTopColor: "#EDE5D5",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  registerButton: {
    backgroundColor: "#B8860B",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  registerButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
  attendingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 30,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "#10B981",
    backgroundColor: "rgba(16,185,129,0.08)",
  },
  attendingText: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "700",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(28,18,8,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 10,
    width: "100%",
    borderWidth: 1,
    borderColor: "#EDE5D5",
  },
  modalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(16,185,129,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  modalTitle: {
    color: "#1C1208",
    fontSize: 22,
    fontWeight: "800",
  },
  modalSub: {
    color: "#9E8E7E",
    fontSize: 13,
  },
  ticketCodeBox: {
    backgroundColor: "rgba(184,134,11,0.1)",
    borderWidth: 1.5,
    borderColor: "#B8860B",
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginVertical: 4,
  },
  ticketCode: {
    color: "#B8860B",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 3,
  },
  modalNote: {
    color: "#9E8E7E",
    fontSize: 13,
    textAlign: "center",
  },
  modalCloseBtn: {
    backgroundColor: "#B8860B",
    borderRadius: 24,
    paddingHorizontal: 44,
    paddingVertical: 14,
    marginTop: 8,
  },
  modalCloseText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 15,
  },
});
