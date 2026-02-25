import { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView, Alert, StyleSheet, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";

// Ethnicity options - matching onboarding (excluding "Other" and "Prefer not to say")
const ETHNICITY_OPTIONS = [
  "Arab",
  "Berber / Amazigh",
  "Persian",
  "Turkic",
  "Kurdish",
  "South Asian",
  "Punjabi",
  "Sindhi",
  "Pashtun",
  "Baloch",
  "Bengali",
  "Tamil",
  "Gujarati",
  "Malayali",
  "East Asian",
  "Southeast Asian",
  "Central Asian",
  "West African",
  "East African",
  "North African",
  "Southern African",
  "Horn of Africa",
  "European",
  "Eastern European",
  "Western European",
  "Latino / Hispanic",
  "Caribbean",
  "Native / Indigenous",
  "Mixed",
];

export default function EthnicityFilterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedEthnicities, setSelectedEthnicities] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.back();
        return;
      }

      const { data } = await supabase
        .from("user_preferences")
        .select("ethnicity_preferences")
        .eq("user_id", user.id)
        .single();

      if (data && data.ethnicity_preferences) {
        setSelectedEthnicities(data.ethnicity_preferences);
      }
    } catch (error) {
      // Error loading preferences
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
            ethnicity_preferences: selectedEthnicities.length > 0 ? selectedEthnicities : null,
            location_enabled: existingPrefs?.location_enabled || false,
            location_filter_type: existingPrefs?.location_filter_type || null,
            search_radius_miles: existingPrefs?.search_radius_miles || null,
            search_location: existingPrefs?.search_location || null,
            search_country: existingPrefs?.search_country || null,
            age_min: existingPrefs?.age_min || null,
            age_max: existingPrefs?.age_max || null,
            height_min_cm: existingPrefs?.height_min_cm || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (error) throw error;

      Alert.alert("Success", "Ethnicity filter saved!", [
        { text: "OK", onPress: () => router.push("/(main)/swipe/filters/") },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
        <Text className="text-[#1C1208] text-2xl font-bold">Ethnicity</Text>
        <Pressable 
          onPress={async () => {
            setSelectedEthnicities([]);
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
                  ethnicity_preferences: null,
                  location_enabled: existingPrefs?.location_enabled || false,
                  location_filter_type: existingPrefs?.location_filter_type || null,
                  search_radius_miles: existingPrefs?.search_radius_miles || null,
                  search_location: existingPrefs?.search_location || null,
                  search_country: existingPrefs?.search_country || null,
                  age_min: existingPrefs?.age_min || null,
                  age_max: existingPrefs?.age_max || null,
                  height_min_cm: existingPrefs?.height_min_cm || null,
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
        {/* Ethnicity Filter */}
        <View className="mb-8">
          <Text className="text-[#1C1208] text-lg font-bold mb-4">Ethnicity</Text>
          
          {/* Search Input */}
          <View className="mb-4">
            <View className="flex-row items-center bg-[#F5F0E8] border border-[#EDE5D5] rounded-xl px-4 py-3">
              <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 10 }} />
              <TextInput
                placeholder="Search ethnicity..."
                placeholderTextColor="#666"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")} className="ml-2">
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Filtered Ethnicity List */}
          <ScrollView
            style={styles.ethnicityList}
            className="bg-white rounded-2xl"
            contentContainerStyle={{ padding: 12 }}
            showsVerticalScrollIndicator={true}
          >
            {(() => {
              const filteredEthnicities = ETHNICITY_OPTIONS.filter((ethnicity) =>
                ethnicity.toLowerCase().includes(searchQuery.toLowerCase())
              );
              
              if (filteredEthnicities.length === 0) {
                return (
                  <View className="py-8 items-center">
                    <Text className="text-[#9E8E7E] text-base">No ethnicities found</Text>
                    <Text className="text-[#C9BFB5] text-sm mt-1">Try a different search term</Text>
                  </View>
                );
              }
              
              return filteredEthnicities.map((ethnicity) => {
                const isSelected = selectedEthnicities.includes(ethnicity);
                return (
                  <Pressable
                    key={ethnicity}
                    className={`p-4 rounded-xl mb-2 ${
                      isSelected ? "bg-[#B8860B]" : "bg-white"
                    }`}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedEthnicities(selectedEthnicities.filter((e) => e !== ethnicity));
                      } else {
                        setSelectedEthnicities([...selectedEthnicities, ethnicity]);
                      }
                    }}
                    style={isSelected ? styles.selectedItem : styles.ethnicityItem}
                  >
                    <Text
                      className={`text-base ${
                        isSelected ? "text-[#1C1208] font-bold" : "text-[#6B5D4F] font-medium"
                      }`}
                    >
                      {ethnicity}
                    </Text>
                  </Pressable>
                );
              });
            })()}
          </ScrollView>
          {selectedEthnicities.length > 0 && (
            <View className="mt-4 bg-[#B8860B]/20 border border-[#B8860B]/30 p-4 rounded-xl">
              <Text className="text-[#6B5D4F] text-sm font-medium mb-2">
                Selected ({selectedEthnicities.length})
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {selectedEthnicities.map((ethnicity) => (
                  <View key={ethnicity} className="bg-[#B8860B]/30 px-3 py-1.5 rounded-full">
                    <Text className="text-white text-xs font-medium">{ethnicity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

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
            <Text className="text-white font-bold text-lg">Save</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1C1208",
    padding: 0,
  },
  ethnicityList: {
    maxHeight: 400,
  },
  ethnicityItem: {
    borderWidth: 1,
    borderColor: "#EDE5D5",
  },
  selectedItem: {
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

