import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";
import EventCard from "../../../components/EventCard";
import { supabase } from "../../../lib/supabase";

interface Event {
  id: string;
  title: string;
  description?: string;
  location_name: string;
  city?: string;
  country?: string;
  event_date: string;
  ticket_price: number;
  ticket_currency?: string;
  cover_image_url?: string;
  tags?: string[];
  distance_miles?: number | null;
  user_has_ticket?: boolean;
  // PostGIS returns lat/lon as separate fields or embedded in location
  lat?: number | null;
  lon?: number | null;
}

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  const fetchEvents = useCallback(async (coords?: { latitude: number; longitude: number } | null) => {
    try {
      const body: Record<string, any> = {};
      if (coords) {
        body.latitude = coords.latitude;
        body.longitude = coords.longitude;
      }

      const { data, error } = await supabase.functions.invoke("get-events", { body });
      if (error) {
        console.error("get-events error:", error);
        return;
      }
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      setEvents(parsed?.events || []);
    } catch (e) {
      console.error("fetchEvents error:", e);
    }
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserCoords(coords);
        await fetchEvents(coords);
      } else {
        await fetchEvents(null);
      }
    } catch {
      await fetchEvents(null);
    } finally {
      setLoading(false);
    }
  }, [fetchEvents]);

  useEffect(() => {
    init();
  }, [init]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents(userCoords);
    setRefreshing(false);
  }, [fetchEvents, userCoords]);

  const mapRegion = userCoords
    ? {
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        latitudeDelta: 1.5,
        longitudeDelta: 1.5,
      }
    : {
        latitude: 20,
        longitude: 0,
        latitudeDelta: 80,
        longitudeDelta: 80,
      };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events</Text>
        <Pressable
          onPress={() => setViewMode(viewMode === "list" ? "map" : "list")}
          style={styles.toggleButton}
          hitSlop={8}
        >
          <Ionicons
            name={viewMode === "list" ? "map-outline" : "list-outline"}
            size={24}
            color="#B8860B"
          />
        </Pressable>
      </View>

      {viewMode === "list" ? (
        events.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="shield-outline" size={52} color="rgba(255,255,255,0.25)" />
            <Text style={styles.emptyTitle}>No upcoming events near you</Text>
            <Text style={styles.emptySub}>Check back soon</Text>
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EventCard
                event={item}
                onPress={() => router.push(`/(main)/events/${item.id}`)}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
            }
          />
        )
      ) : (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={mapRegion}
            showsUserLocation={userCoords !== null}
          >
            {events.map((event) => {
              const lat = event.lat;
              const lon = event.lon;
              if (lat == null || lon == null) return null;
              return (
                <Marker
                  key={event.id}
                  coordinate={{ latitude: lat, longitude: lon }}
                  pinColor="#B8860B"
                >
                  <Callout
                    onPress={() => router.push(`/(main)/events/${event.id}`)}
                    style={styles.callout}
                  >
                    <Text style={styles.calloutTitle} numberOfLines={2}>{event.title}</Text>
                    <Text style={styles.calloutDate}>
                      {new Date(event.event_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                    <Text style={styles.calloutView}>View →</Text>
                  </Callout>
                </Marker>
              );
            })}
          </MapView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFAF5",
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    backgroundColor: "#FDFAF5",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    color: "#1C1208",
    fontSize: 28,
    fontWeight: "800",
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#B8860B",
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyTitle: {
    color: "#1C1208",
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySub: {
    color: "#9E8E7E",
    fontSize: 14,
    textAlign: "center",
  },
  mapContainer: {
    flex: 1,
  },
  callout: {
    width: 180,
    padding: 8,
    gap: 2,
  },
  calloutTitle: {
    fontWeight: "700",
    fontSize: 13,
    color: "#111",
  },
  calloutDate: {
    fontSize: 12,
    color: "#555",
    marginTop: 2,
  },
  calloutView: {
    fontSize: 12,
    color: "#B8860B",
    fontWeight: "700",
    marginTop: 4,
  },
});
