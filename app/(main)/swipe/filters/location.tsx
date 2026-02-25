import { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { supabase } from "../../../../lib/supabase";
import Slider from "@react-native-community/slider";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

const MAX_RADIUS_MILES = 400;

// Common countries list
const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany", "France",
  "Italy", "Spain", "Netherlands", "Belgium", "Switzerland", "Austria", "Sweden",
  "Norway", "Denmark", "Finland", "Poland", "Ireland", "Portugal", "Greece",
  "Turkey", "Saudi Arabia", "UAE", "Qatar", "Kuwait", "Bahrain", "Oman",
  "Jordan", "Lebanon", "Egypt", "Pakistan", "India", "Bangladesh", "Malaysia",
  "Singapore", "Indonesia", "Philippines", "Thailand", "Japan", "South Korea",
  "China", "Brazil", "Mexico", "Argentina", "Chile", "South Africa", "Nigeria",
  "Kenya", "Morocco", "Tunisia", "Algeria", "Other"
];

type LocationFilterType = "distance" | "country" | null;

export default function LocationFilterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<LocationFilterType>(null);
  const [searchRadiusMiles, setSearchRadiusMiles] = useState(50);
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 10,
    longitudeDelta: 10,
  });

  useEffect(() => {
    loadPreferences();
    loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (filterType === "distance" && userLocation) {
      const radiusKm = (searchRadiusMiles * 1.60934);
      const delta = (radiusKm / 111) * 2.5;
      
      setMapRegion({
        latitude: userLocation.lat,
        longitude: userLocation.lon,
        latitudeDelta: delta,
        longitudeDelta: delta,
      });
    }
  }, [filterType, userLocation, searchRadiusMiles]);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("photos, location")
        .eq("id", user.id)
        .single();

      if (data) {
        setUserProfile(data);
        
        if (data.location) {
          const locationStr = data.location;
          const match = locationStr.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
          if (match) {
            const lon = parseFloat(match[1]);
            const lat = parseFloat(match[2]);
            setUserLocation({ lat, lon });
            setSearchLocation({ lat, lon });
          }
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.back();
        return;
      }

      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading preferences:", error);
      }

      if (data) {
        setFilterType(data.location_filter_type || null);
        setSearchRadiusMiles(data.search_radius_miles || 50);
        setSelectedCountry(data.search_country || "");
        
        if (data.search_location) {
          const locationStr = data.search_location;
          const match = locationStr.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
          if (match) {
            const lon = parseFloat(match[1]);
            const lat = parseFloat(match[2]);
            setSearchLocation({ lat, lon });
            if (!userLocation) {
              setUserLocation({ lat, lon });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is needed to use location filters.");
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = location.coords.latitude;
      const lon = location.coords.longitude;

      setUserLocation({ lat, lon });
      setSearchLocation({ lat, lon });
      setFilterType("distance");
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Failed to get your location. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.back();
        return;
      }

      let locationPoint: string | null = null;
      let searchRadiusMilesValue: number | null = null;
      let searchCountryValue: string | null = null;

      const isLocationFilterEnabled = !!filterType;
      
      if (isLocationFilterEnabled) {
        if (filterType === "distance") {
          const locationToUse = searchLocation || userLocation;
          if (!locationToUse) {
            Alert.alert("Error", "Please set a location for distance filtering. Tap 'Get My Location' to use your current location.");
            setSaving(false);
            return;
          }
          locationPoint = `SRID=4326;POINT(${locationToUse.lon} ${locationToUse.lat})`;
          searchRadiusMilesValue = searchRadiusMiles;
          searchCountryValue = null;
        } else if (filterType === "country") {
          if (!selectedCountry) {
            Alert.alert("Error", "Please select a country.");
            setSaving(false);
            return;
          }
          searchCountryValue = selectedCountry;
          locationPoint = null;
          searchRadiusMilesValue = null;
        }
      }

      // Get existing preferences to preserve other filter settings
      const { data: existingPrefs } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const { error } = await supabase
        .from("user_preferences")
        .upsert(
          {
            user_id: user.id,
            location_enabled: isLocationFilterEnabled,
            location_filter_type: filterType,
            search_radius_miles: searchRadiusMilesValue,
            search_location: locationPoint,
            search_country: searchCountryValue,
            age_min: existingPrefs?.age_min || null,
            age_max: existingPrefs?.age_max || null,
            height_min_cm: existingPrefs?.height_min_cm || null,
            ethnicity_preferences: existingPrefs?.ethnicity_preferences || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (error) throw error;

      Alert.alert("Success", "Location filter saved!", [
        { text: "OK", onPress: () => router.push("/(main)/swipe/filters/") },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !userLocation) {
    return (
      <View className="flex-1 bg-[#FDFAF5] items-center justify-center">
        <ActivityIndicator size="large" color="#1C1208" />
        <Text className="text-[#9E8E7E] mt-4">Loading preferences...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FDFAF5]">
      {/* Header */}
      <View className="pt-14 px-6 pb-6 flex-row items-center justify-between border-b border-[#EDE5D5]">
        <Pressable 
          onPress={() => router.push("/(main)/swipe/filters/")}
          className="px-2 py-1"
        >
          <Ionicons name="arrow-back" size={24} color="#1C1208" />
        </Pressable>
        <Text className="text-[#1C1208] text-2xl font-bold">Location</Text>
        <Pressable 
          onPress={async () => {
            setFilterType(null);
            setSearchLocation(null);
            setSearchRadiusMiles(50);
            setSelectedCountry("");
            // Save cleared values
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: existingPrefs } = await supabase
                .from("user_preferences")
                .select("*")
                .eq("user_id", user.id)
                .single();
              
              await supabase.from("user_preferences").upsert(
                {
                  user_id: user.id,
                  location_enabled: false,
                  location_filter_type: null,
                  search_radius_miles: null,
                  search_location: null,
                  search_country: null,
                  age_min: existingPrefs?.age_min || null,
                  age_max: existingPrefs?.age_max || null,
                  height_min_cm: existingPrefs?.height_min_cm || null,
                  ethnicity_preferences: existingPrefs?.ethnicity_preferences || null,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id" }
              );
            }
          }}
          className="px-2 py-1"
        >
          <Text className="text-[#6B5D4F] text-base font-medium">Clear</Text>
        </Pressable>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter Type Selection */}
        <View className="mb-8">
          <Text className="text-[#1C1208] text-2xl font-bold mb-6">Choose Your Filter</Text>
          <View className="flex-row gap-3">
            <Pressable
              className={`flex-1 p-4 rounded-2xl ${
                filterType === "distance" ? "bg-[#B8860B]" : "bg-[#F5F0E8]"
              }`}
              onPress={() => {
                setFilterType("distance");
                setSelectedCountry("");
                if (userLocation) {
                  setSearchLocation(userLocation);
                } else {
                  getCurrentLocation();
                }
              }}
              style={filterType === "distance" ? styles.activeFilterButton : styles.inactiveFilterButton}
            >
              <Text
                className={`text-center font-semibold text-sm ${
                  filterType === "distance" ? "text-[#1C1208]" : "text-[#9E8E7E]"
                }`}
              >
                Select by Distance
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 p-4 rounded-2xl ${
                filterType === "country" ? "bg-[#B8860B]" : "bg-[#F5F0E8]"
              }`}
              onPress={() => {
                setFilterType("country");
                setSearchLocation(null);
                setSearchRadiusMiles(50);
              }}
              style={filterType === "country" ? styles.activeFilterButton : styles.inactiveFilterButton}
            >
              <Text
                className={`text-center font-semibold text-sm ${
                  filterType === "country" ? "text-[#1C1208]" : "text-[#9E8E7E]"
                }`}
              >
                Select by Country
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Distance Filter with Map */}
        {filterType === "distance" && (
          <View className="mb-8">
            {!userLocation ? (
              <View className="mb-6">
                <Pressable
                  className="bg-[#F5F0E8] p-5 rounded-2xl items-center border border-[#EDE5D5]"
                  onPress={getCurrentLocation}
                  disabled={loading}
                  style={styles.getLocationButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#1C1208" />
                  ) : (
                    <>
                      <Text className="text-[#1C1208] font-bold text-base mb-1">📍</Text>
                      <Text className="text-[#1C1208] font-semibold text-base">Get My Location</Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : (
              <>
                <View className="mb-4">
                  <Text className="text-[#1C1208] text-lg font-bold mb-1">
                    Search Radius
                  </Text>
                  <Text className="text-[#D4AF37] text-2xl font-bold">
                    {searchRadiusMiles} miles
                  </Text>
                </View>

                {/* Map View */}
                <View style={styles.mapContainer}>
                  <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    region={mapRegion}
                    onRegionChangeComplete={setMapRegion}
                    scrollEnabled={true}
                    zoomEnabled={true}
                  >
                    {userLocation && (
                      <Marker
                        coordinate={{
                          latitude: userLocation.lat,
                          longitude: userLocation.lon,
                        }}
                        anchor={{ x: 0.5, y: 0.5 }}
                      >
                        <View style={styles.markerContainer}>
                          {userProfile?.photos?.[0] ? (
                            <Image
                              source={{ uri: userProfile.photos[0] }}
                              style={styles.profileImage}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={styles.profilePlaceholder}>
                              <Text style={styles.profilePlaceholderText}>👤</Text>
                            </View>
                          )}
                        </View>
                      </Marker>
                    )}

                    {userLocation && (
                      <Circle
                        center={{
                          latitude: userLocation.lat,
                          longitude: userLocation.lon,
                        }}
                        radius={searchRadiusMiles * 1609.34}
                        fillColor="rgba(255, 235, 59, 0.3)"
                        strokeColor="rgba(255, 235, 59, 0.6)"
                        strokeWidth={2}
                      />
                    )}
                  </MapView>
                </View>

                {/* Radius Slider */}
                <View className="mt-6">
                  <Slider
                    style={{ width: "100%", height: 40 }}
                    minimumValue={1}
                    maximumValue={MAX_RADIUS_MILES}
                    step={1}
                    value={searchRadiusMiles}
                    onValueChange={setSearchRadiusMiles}
                    minimumTrackTintColor="#B8860B"
                    maximumTrackTintColor="#ffffff33"
                    thumbTintColor="#B8860B"
                  />
                  <View className="flex-row justify-between mt-3">
                    <Text className="text-[#9E8E7E] text-xs font-medium">1 mile</Text>
                    <Text className="text-[#9E8E7E] text-xs font-medium">{MAX_RADIUS_MILES} miles</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* Country Filter */}
        {filterType === "country" && (
          <View className="mb-8">
            <Text className="text-[#1C1208] text-lg font-bold mb-4">Select Country</Text>
            <ScrollView
              style={styles.countryList}
              className="bg-white rounded-2xl"
              contentContainerStyle={{ padding: 12 }}
              showsVerticalScrollIndicator={true}
            >
              {COUNTRIES.map((country) => (
                <Pressable
                  key={country}
                  className={`p-4 rounded-xl mb-2 ${
                    selectedCountry === country ? "bg-[#B8860B]" : "bg-white"
                  }`}
                  onPress={() => setSelectedCountry(country)}
                  style={selectedCountry === country ? styles.selectedCountryItem : styles.countryItem}
                >
                  <Text
                    className={`text-base ${
                      selectedCountry === country ? "text-[#1C1208] font-bold" : "text-[#6B5D4F] font-medium"
                    }`}
                  >
                    {country}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {selectedCountry && (
              <View className="mt-4 bg-[#B8860B]/20 border border-[#B8860B]/30 p-4 rounded-xl">
                <Text className="text-[#6B5D4F] text-sm font-medium mb-1">Selected Country</Text>
                <Text className="text-[#1C1208] font-bold text-lg">{selectedCountry}</Text>
              </View>
            )}
          </View>
        )}

        {/* Save Button */}
        <Pressable
          className="bg-[#B8860B] p-5 rounded-2xl items-center mt-2 mb-4"
          onPress={savePreferences}
          disabled={saving}
          style={styles.saveButton}
        >
          {saving ? (
            <ActivityIndicator color="#1C1208" />
          ) : (
            <Text className="text-[#1C1208] font-bold text-lg">Save</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  activeFilterButton: {
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  inactiveFilterButton: {
    borderWidth: 1,
    borderColor: "#EDE5D5",
  },
  getLocationButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapContainer: {
    width: "100%",
    height: 400,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#EDE5D5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  markerContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "#B8860B",
    overflow: "hidden",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  profilePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#B8860B",
    justifyContent: "center",
    alignItems: "center",
  },
  profilePlaceholderText: {
    fontSize: 28,
  },
  countryList: {
    maxHeight: 350,
  },
  countryItem: {
    borderWidth: 1,
    borderColor: "#EDE5D5",
  },
  selectedCountryItem: {
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButton: {
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});

