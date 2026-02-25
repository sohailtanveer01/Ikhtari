import { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../../../lib/supabase";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";

const MIN_HEIGHT_CM = 100;
const MAX_HEIGHT_CM = 250;

export default function HeightFilterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [heightMinCm, setHeightMinCm] = useState<number | null>(null);

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
        .select("height_min_cm")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setHeightMinCm(data.height_min_cm || null);
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
            height_min_cm: heightMinCm,
            location_enabled: existingPrefs?.location_enabled || false,
            location_filter_type: existingPrefs?.location_filter_type || null,
            search_radius_miles: existingPrefs?.search_radius_miles || null,
            search_location: existingPrefs?.search_location || null,
            search_country: existingPrefs?.search_country || null,
            age_min: existingPrefs?.age_min || null,
            age_max: existingPrefs?.age_max || null,
            ethnicity_preferences: existingPrefs?.ethnicity_preferences || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (error) throw error;

      Alert.alert("Success", "Height filter saved!", [
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
        <Text className="text-[#1C1208] text-2xl font-bold">Height</Text>
        <Pressable 
          onPress={async () => {
            setHeightMinCm(null);
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
                  height_min_cm: null,
                  location_enabled: existingPrefs?.location_enabled || false,
                  location_filter_type: existingPrefs?.location_filter_type || null,
                  search_radius_miles: existingPrefs?.search_radius_miles || null,
                  search_location: existingPrefs?.search_location || null,
                  search_country: existingPrefs?.search_country || null,
                  age_min: existingPrefs?.age_min || null,
                  age_max: existingPrefs?.age_max || null,
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
        {/* Height Filter */}
        <View className="mb-8">
          <Text className="text-[#1C1208] text-lg font-bold mb-4">Minimum Height</Text>
          <View className="bg-white rounded-2xl p-5 border border-[#EDE5D5]">
            <View>
              <Text className="text-[#6B5D4F] text-sm mb-2">Minimum Height (cm)</Text>
              <View className="flex-row items-center gap-4">
                <Slider
                  style={{ flex: 1, height: 40 }}
                  minimumValue={MIN_HEIGHT_CM}
                  maximumValue={MAX_HEIGHT_CM}
                  step={5}
                  value={heightMinCm || MIN_HEIGHT_CM}
                  onValueChange={(value) => setHeightMinCm(Math.floor(value))}
                  minimumTrackTintColor="#B8860B"
                  maximumTrackTintColor="#ffffff33"
                  thumbTintColor="#B8860B"
                />
                <Text className="text-[#1C1208] font-bold text-lg w-16 text-right">
                  {heightMinCm || MIN_HEIGHT_CM} cm
                </Text>
              </View>
            </View>
            <Pressable
              className="mt-4 bg-[#F5F0E8] p-3 rounded-xl"
              onPress={async () => {
                setHeightMinCm(null);
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
                      height_min_cm: null,
                      location_enabled: existingPrefs?.location_enabled || false,
                      location_filter_type: existingPrefs?.location_filter_type || null,
                      search_radius_miles: existingPrefs?.search_radius_miles || null,
                      search_location: existingPrefs?.search_location || null,
                      search_country: existingPrefs?.search_country || null,
                      age_min: existingPrefs?.age_min || null,
                      age_max: existingPrefs?.age_max || null,
                      ethnicity_preferences: existingPrefs?.ethnicity_preferences || null,
                      updated_at: new Date().toISOString(),
                    },
                    { onConflict: "user_id" }
                  );
                }
              }}
            >
              <Text className="text-[#6B5D4F] text-center font-medium">Clear</Text>
            </Pressable>
          </View>
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
  saveButton: {
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});

