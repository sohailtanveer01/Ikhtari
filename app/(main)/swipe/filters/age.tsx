import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import RangeSlider from "rn-range-slider";
import { supabase } from "../../../../lib/supabase";

const MIN_AGE = 18;
const MAX_AGE = 100;

const Thumb = () => (
  <View
    style={{
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "#B8860B",
      borderWidth: 2,
      borderColor: "#000",
    }}
  />
);

const Rail = () => (
  <View
    style={{
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: "rgba(255,255,255,0.25)",
    }}
  />
);

const RailSelected = () => (
  <View
    style={{
      height: 4,
      backgroundColor: "#B8860B",
      borderRadius: 2,
    }}
  />
);

export default function AgeFilterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // default values
  const [ageMin, setAgeMin] = useState<number>(MIN_AGE);
  const [ageMax, setAgeMax] = useState<number>(MAX_AGE);

  useEffect(() => {
    loadPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.back();

      const { data } = await supabase
        .from("user_preferences")
        .select("age_min, age_max")
        .eq("user_id", user.id)
        .single();

      setAgeMin(data?.age_min ?? MIN_AGE);
      setAgeMax(data?.age_max ?? MAX_AGE);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.back();

      const { data: existingPrefs } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const { error } = await supabase.from("user_preferences").upsert(
        {
          user_id: user.id,
          age_min: ageMin,
          age_max: ageMax,
          location_enabled: existingPrefs?.location_enabled || false,
          location_filter_type: existingPrefs?.location_filter_type || null,
          search_radius_miles: existingPrefs?.search_radius_miles || null,
          search_location: existingPrefs?.search_location || null,
          search_country: existingPrefs?.search_country || null,
          height_min_cm: existingPrefs?.height_min_cm || null,
          ethnicity_preferences: existingPrefs?.ethnicity_preferences || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;

      Alert.alert("Success", "Age filter saved!", [
        { text: "OK", onPress: () => router.push("/(main)/swipe/filters/") },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save preferences.");
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
        <Pressable onPress={() => router.push("/(main)/swipe/filters/")} className="px-2 py-1">
          <Ionicons name="arrow-back" size={24} color="#1C1208" />
        </Pressable>
        <Text className="text-[#1C1208] text-2xl font-bold">Age</Text>
        <Pressable 
          onPress={async () => {
            setAgeMin(MIN_AGE);
            setAgeMax(MAX_AGE);
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
                  age_min: null,
                  age_max: null,
                  location_enabled: existingPrefs?.location_enabled || false,
                  location_filter_type: existingPrefs?.location_filter_type || null,
                  search_radius_miles: existingPrefs?.search_radius_miles || null,
                  search_location: existingPrefs?.search_location || null,
                  search_country: existingPrefs?.search_country || null,
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
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8">
          <Text className="text-[#1C1208] text-lg font-bold mb-4">Age Range</Text>

          <View className="bg-white rounded-2xl p-5 border border-[#EDE5D5]">
            {/* Value row */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[#1C1208] font-bold text-lg">{ageMin}</Text>
              <Text className="text-[#9E8E7E] text-sm">to</Text>
              <Text className="text-[#1C1208] font-bold text-lg">{ageMax}</Text>
            </View>

            <RangeSlider
              min={MIN_AGE}
              max={MAX_AGE}
              step={1}
              low={ageMin ?? MIN_AGE}
              high={ageMax ?? MAX_AGE}
              floatingLabel
              disableRange={false}
              renderThumb={Thumb}
              renderRail={Rail}
              renderRailSelected={RailSelected}
              onValueChanged={(low, high) => {
                setAgeMin(low);
                setAgeMax(high);
              }}
            />

            <Pressable
              className="mt-5 bg-[#F5F0E8] p-3 rounded-xl"
              onPress={async () => {
                setAgeMin(MIN_AGE);
                setAgeMax(MAX_AGE);
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
                      age_min: null,
                      age_max: null,
                      location_enabled: existingPrefs?.location_enabled || false,
                      location_filter_type: existingPrefs?.location_filter_type || null,
                      search_radius_miles: existingPrefs?.search_radius_miles || null,
                      search_location: existingPrefs?.search_location || null,
                      search_country: existingPrefs?.search_country || null,
                      height_min_cm: existingPrefs?.height_min_cm || null,
                      ethnicity_preferences: existingPrefs?.ethnicity_preferences || null,
                      updated_at: new Date().toISOString(),
                    },
                    { onConflict: "user_id" }
                  );
                }
              }}
            >
              <Text className="text-[#6B5D4F] text-center font-medium">
                Clear
              </Text>
            </Pressable>
          </View>
        </View>

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
  saveButton: {
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
