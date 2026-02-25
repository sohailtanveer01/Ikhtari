import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
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
  }) + " · " + date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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

  const handleBuyTicket = () => {
    if (!event) return;
    const isFree = !event.ticket_price || event.ticket_price === 0;
    const currency = event.ticket_currency || "USD";
    const currencySymbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
    const priceLabel = isFree ? "Free" : `${currencySymbol}${event.ticket_price}`;

    Alert.alert(
      "Confirm Registration",
      `Register for "${event.title}"?\n\nPrice: ${priceLabel}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isFree ? "Register" : `Pay ${priceLabel}`,
          onPress: purchaseTicket,
        },
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
        Alert.alert("Error", error.message || "Failed to purchase ticket");
        return;
      }

      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (parsed?.success) {
        setSuccessTicketCode(parsed.ticket_code);
        setSuccessModal(true);
        // Refresh ticket state
        setTicket({ ticket_code: parsed.ticket_code, status: "confirmed" });
      } else {
        Alert.alert("Error", parsed?.error || "Failed to purchase ticket");
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
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isFree = !event.ticket_price || event.ticket_price === 0;
  const currency = event.ticket_currency || "USD";
  const currencySymbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  const hasTicket = ticket?.status === "confirmed";
  const hasLocation = event.lat != null && event.lon != null;
  const spotsLeft = event.max_capacity != null
    ? event.max_capacity - (event.tickets_sold || 0)
    : null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Cover image */}
        <View style={styles.coverContainer}>
          {event.cover_image_url ? (
            <Image
              source={{ uri: event.cover_image_url }}
              style={styles.coverImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.coverImage, styles.coverFallback]}>
              <Ionicons name="calendar" size={52} color="rgba(28,18,8,0.2)" />
            </View>
          )}
          {/* Back button overlay */}
          <Pressable
            onPress={() => router.back()}
            style={[styles.backOverlay, { top: insets.top + 8 }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Date */}
          <View style={styles.metaRow}>
            <View style={styles.metaIcon}>
              <Ionicons name="calendar-outline" size={18} color="#B8860B" />
            </View>
            <Text style={styles.metaText}>{formatEventDate(event.event_date)}</Text>
          </View>

          {/* Location */}
          <View style={styles.metaRow}>
            <View style={styles.metaIcon}>
              <Ionicons name="location-outline" size={18} color="#B8860B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.metaText}>{event.location_name}</Text>
              {event.address && (
                <Text style={styles.metaSubText}>{event.address}</Text>
              )}
              {event.city && (
                <Text style={styles.metaSubText}>{event.city}{event.country ? `, ${event.country}` : ""}</Text>
              )}
            </View>
          </View>

          {/* Organizer */}
          {event.organizer_name && (
            <View style={styles.metaRow}>
              <View style={styles.metaIcon}>
                <Ionicons name="person-outline" size={18} color="#B8860B" />
              </View>
              <Text style={styles.metaText}>Organized by {event.organizer_name}</Text>
            </View>
          )}

          {/* Capacity */}
          {spotsLeft !== null && (
            <View style={styles.metaRow}>
              <View style={styles.metaIcon}>
                <Ionicons name="people-outline" size={18} color="#B8860B" />
              </View>
              <Text style={styles.metaText}>
                {spotsLeft <= 0 ? "Sold out" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} remaining`}
              </Text>
            </View>
          )}

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

          {/* Description */}
          {event.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionLabel}>About this event</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>
          )}

          {/* Mini map */}
          {hasLocation && (
            <View style={styles.miniMapContainer}>
              <Text style={styles.sectionLabel}>Location</Text>
              <MapView
                style={styles.miniMap}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                initialRegion={{
                  latitude: event.lat!,
                  longitude: event.lon!,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
              >
                <Marker
                  coordinate={{ latitude: event.lat!, longitude: event.lon! }}
                  pinColor="#B8860B"
                />
              </MapView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom fixed bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        {hasTicket ? (
          <View style={styles.attendingButton}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.attendingButtonText}>You're Attending</Text>
          </View>
        ) : (
          <Pressable
            onPress={handleBuyTicket}
            style={[styles.buyButton, purchasing && styles.buyButtonDisabled]}
            disabled={purchasing || (spotsLeft !== null && spotsLeft <= 0)}
          >
            {purchasing ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.buyButtonText}>
                {spotsLeft !== null && spotsLeft <= 0
                  ? "Sold Out"
                  : isFree
                  ? "Register — Free"
                  : `Buy Ticket — ${currencySymbol}${event.ticket_price}`}
              </Text>
            )}
          </Pressable>
        )}
      </View>

      {/* Success Modal */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="checkmark-circle" size={60} color="#10B981" />
            <Text style={styles.modalTitle}>You're Registered!</Text>
            <Text style={styles.modalSub}>Your ticket code:</Text>
            <View style={styles.ticketCodeBox}>
              <Text style={styles.ticketCode}>{successTicketCode}</Text>
            </View>
            <Text style={styles.modalNote}>Show this code at the event entrance.</Text>
            <Pressable onPress={() => setSuccessModal(false)} style={styles.modalClose}>
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
  backBtn: {
    backgroundColor: "#B8860B",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backBtnText: {
    color: "#000",
    fontWeight: "700",
  },
  coverContainer: {
    height: 220,
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverFallback: {
    backgroundColor: "#F5F0E8",
    alignItems: "center",
    justifyContent: "center",
  },
  backOverlay: {
    position: "absolute",
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 20,
    gap: 12,
  },
  title: {
    color: "#1C1208",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  metaIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(184,134,11,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  metaText: {
    color: "#1C1208",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  metaSubText: {
    color: "#9E8E7E",
    fontSize: 13,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  tagChip: {
    backgroundColor: "rgba(184,134,11,0.15)",
    borderWidth: 1,
    borderColor: "rgba(184,134,11,0.4)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: {
    color: "#B8860B",
    fontSize: 12,
    fontWeight: "600",
  },
  descriptionContainer: {
    marginTop: 8,
    gap: 8,
  },
  sectionLabel: {
    color: "#9E8E7E",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  description: {
    color: "#6B5D4F",
    fontSize: 14,
    lineHeight: 22,
  },
  miniMapContainer: {
    marginTop: 8,
    gap: 8,
  },
  miniMap: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
  },
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
  buyButton: {
    backgroundColor: "#B8860B",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buyButtonDisabled: {
    opacity: 0.6,
  },
  buyButtonText: {
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
  attendingButtonText: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "700",
  },
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
  modalTitle: {
    color: "#1C1208",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },
  modalSub: {
    color: "#9E8E7E",
    fontSize: 14,
  },
  ticketCodeBox: {
    backgroundColor: "rgba(184,134,11,0.12)",
    borderWidth: 1.5,
    borderColor: "#B8860B",
    borderRadius: 12,
    paddingHorizontal: 24,
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
  modalClose: {
    backgroundColor: "#B8860B",
    borderRadius: 24,
    paddingHorizontal: 40,
    paddingVertical: 14,
    marginTop: 8,
  },
  modalCloseText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 15,
  },
});
