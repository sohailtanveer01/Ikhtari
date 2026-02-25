import { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";

// Marital status options
const MARITAL_STATUS_OPTIONS = [
  "Never Married",
  "Divorced",
  "Widowed",
  "Annulled",
];

export default function MaritalStatusFilterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

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
        .select("marital_status_preferences")
        .eq("user_id", user.id)
        .single();

      if (data && data.marital_status_preferences) {
        setSelectedStatuses(data.marital_status_preferences);
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
            marital_status_preferences: selectedStatuses.length > 0 ? selectedStatuses : null,
            // Preserve existing preferences
            location_enabled: existingPrefs?.location_enabled || false,
            location_filter_type: existingPrefs?.location_filter_type || null,
            search_radius_miles: existingPrefs?.search_radius_miles || null,
            search_location: existingPrefs?.search_location || null,
            search_country: existingPrefs?.search_country || null,
            age_min: existingPrefs?.age_min || null,
            age_max: existingPrefs?.age_max || null,
            height_min_cm: existingPrefs?.height_min_cm || null,
            ethnicity_preferences: existingPrefs?.ethnicity_preferences || null,
            children_preferences: existingPrefs?.children_preferences || null,
            religiosity_preferences: existingPrefs?.religiosity_preferences || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (error) throw error;

      Alert.alert("Success", "Marital status filter saved!", [
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
        <ActivityIndicator size="large" color="#B8860B" />
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
        <Text className="text-[#1C1208] text-2xl font-bold">Marital Status</Text>
        <Pressable 
          onPress={async () => {
            setSelectedStatuses([]);
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
                  marital_status_preferences: null,
                  location_enabled: existingPrefs?.location_enabled || false,
                  location_filter_type: existingPrefs?.location_filter_type || null,
                  search_radius_miles: existingPrefs?.search_radius_miles || null,
                  search_location: existingPrefs?.search_location || null,
                  search_country: existingPrefs?.search_country || null,
                  age_min: existingPrefs?.age_min || null,
                  age_max: existingPrefs?.age_max || null,
                  height_min_cm: existingPrefs?.height_min_cm || null,
                  ethnicity_preferences: existingPrefs?.ethnicity_preferences || null,
                  children_preferences: existingPrefs?.children_preferences || null,
                  religiosity_preferences: existingPrefs?.religiosity_preferences || null,
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
        {/* Info */}
        <View className="mb-6 bg-[#B8860B]/10 border border-[#B8860B]/20 rounded-xl p-4">
          <Text className="text-[#6B5D4F] text-sm">
            Select the marital statuses you're open to. Leave empty to show all.
          </Text>
        </View>

        {/* Marital Status Options */}
        <View className="mb-8">
          <Text className="text-[#1C1208] text-lg font-bold mb-4">Marital Status</Text>
          <View className="bg-white rounded-2xl p-3">
            {MARITAL_STATUS_OPTIONS.map((status) => {
              const isSelected = selectedStatuses.includes(status);
              return (
                <Pressable
                  key={status}
                  className={`p-4 rounded-xl mb-2 ${
                    isSelected ? "bg-[#B8860B]" : "bg-white"
                  }`}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
                    } else {
                      setSelectedStatuses([...selectedStatuses, status]);
                    }
                  }}
                  style={isSelected ? styles.selectedItem : styles.optionItem}
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`text-base ${
                        isSelected ? "text-[#1C1208] font-bold" : "text-[#6B5D4F] font-medium"
                      }`}
                    >
                      {status}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#1C1208" />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
          
          {selectedStatuses.length > 0 && (
            <View className="mt-4 bg-[#B8860B]/20 border border-[#B8860B]/30 p-4 rounded-xl">
              <Text className="text-[#6B5D4F] text-sm font-medium mb-2">
                Selected ({selectedStatuses.length})
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {selectedStatuses.map((status) => (
                  <View key={status} className="bg-[#B8860B]/30 px-3 py-1.5 rounded-full">
                    <Text className="text-white text-xs font-medium">{status}</Text>
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
  optionItem: {
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

