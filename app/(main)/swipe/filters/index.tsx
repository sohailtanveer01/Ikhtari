import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../../../lib/supabase";

export default function FiltersListScreen() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadPreferences = useCallback(async () => {
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
        setPreferences(data);
      } else {
        // If no preferences exist, set to empty object
        setPreferences(null);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleClearAll = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          location_enabled: false,
          location_filter_type: "distance",
          search_radius_miles: 50,
          search_location: null,
          search_country: null,
          age_min: null,
          age_max: null,
          height_min_cm: null,
          height_max_cm: null,
          ethnicity_preferences: null,
          marital_status_preferences: null,
          children_preferences: null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (error) throw error;

      // Give feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Filters Cleared", "All your preferences have been reset to default.");

      // Reload preferences to refresh the UI
      await loadPreferences();
    } catch (error) {
      console.error("Error clearing filters:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Reload preferences when screen comes into focus (e.g., after saving a filter)
  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [loadPreferences])
  );

  const getLocationFilterValue = () => {
    if (!preferences?.location_enabled) return "Not set";
    if (preferences.location_filter_type === "distance") {
      return `${preferences.search_radius_miles || 50} miles`;
    } else if (preferences.location_filter_type === "country") {
      return preferences.search_country || "Not set";
    }
    return "Not set";
  };

  const getAgeFilterValue = () => {
    if (!preferences?.age_min && !preferences?.age_max) return "Not set";
    const min = preferences.age_min || 18;
    const max = preferences.age_max || 100;
    return `${min} - ${max}`;
  };

  const getHeightFilterValue = () => {
    if (!preferences?.height_min_cm) return "Not set";
    return `${preferences.height_min_cm} cm`;
  };

  const getEthnicityFilterValue = () => {
    if (!preferences?.ethnicity_preferences || preferences.ethnicity_preferences.length === 0) {
      return "Not set";
    }
    const count = preferences.ethnicity_preferences.length;
    return `${count} selected`;
  };

  const getMaritalStatusFilterValue = () => {
    if (!preferences?.marital_status_preferences || preferences.marital_status_preferences.length === 0) {
      return "Not set";
    }
    const count = preferences.marital_status_preferences.length;
    return `${count} selected`;
  };

  const getChildrenFilterValue = () => {
    if (!preferences?.children_preferences || preferences.children_preferences.length === 0) {
      return "Not set";
    }
    const options: Record<string, string> = { no: "No children", yes: "Has children" };
    return preferences.children_preferences.map((c: string) => options[c] || c).join(", ");
  };

  const FilterItem = ({
    icon,
    iconColor,
    title,
    value,
    onPress
  }: {
    icon: string;
    iconColor: string;
    title: string;
    value: string;
    onPress: () => void;
  }) => (
    <Pressable
      style={styles.filterItem}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
        <Ionicons name={icon as any} size={24} color="#FFFFFF" />
      </View>
      <View style={styles.filterContent}>
        <Text style={styles.filterTitle}>{title}</Text>
        <Text style={styles.filterValue}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1C1208" />
          </Pressable>
          <Text style={styles.headerTitle}>Filters</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B8860B" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1C1208" />
        </Pressable>
        <Text style={styles.headerTitle}>Filters</Text>
        <Pressable
          onPress={handleClearAll}
          disabled={loading}

          style={({ pressed }) => [
            styles.clearAllButton,
            { opacity: pressed ? 0.8 : 1 }
          ]}
        >
          <Text style={styles.clearAllText}>Clear all</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Location Filter */}
        <View style={styles.section}>
          <FilterItem
            icon="location"
            iconColor="#B8860B"
            title="Location"
            value={getLocationFilterValue()}
            onPress={() => router.push("/(main)/swipe/filters/location")}
          />
        </View>

        {/* Age Filter */}
        <View style={styles.section}>
          <FilterItem
            icon="calendar"
            iconColor="#B8860B"
            title="Age"
            value={getAgeFilterValue()}
            onPress={() => router.push("/(main)/swipe/filters/age")}
          />
        </View>

        {/* Height Filter */}
        <View style={styles.section}>
          <FilterItem
            icon="resize"
            iconColor="#B8860B"
            title="Height"
            value={getHeightFilterValue()}
            onPress={() => router.push("/(main)/swipe/filters/height")}
          />
        </View>

        {/* Ethnicity Filter */}
        <View style={styles.section}>
          <FilterItem
            icon="people"
            iconColor="#B8860B"
            title="Ethnicity"
            value={getEthnicityFilterValue()}
            onPress={() => router.push("/(main)/swipe/filters/ethnicity")}
          />
        </View>

        {/* Marital Status Filter */}
        <View style={styles.section}>
          <FilterItem
            icon="heart"
            iconColor="#B8860B"
            title="Marital Status"
            value={getMaritalStatusFilterValue()}
            onPress={() => router.push("/(main)/swipe/filters/marital-status")}
          />
        </View>

        {/* Children Filter */}
        <View style={styles.section}>
          <FilterItem
            icon="people-circle"
            iconColor="#B8860B"
            title="Children"
            value={getChildrenFilterValue()}
            onPress={() => router.push("/(main)/swipe/filters/children")}
          />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFAF5",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EDE5D5",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F0E8",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1C1208",
    flex: 1,
    textAlign: "center",
  },
  clearAllButton: {
    backgroundColor: "#B8860B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  clearAllText: {
    color: "#1C1208",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  filterContent: {
    flex: 1,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1208",
    marginBottom: 4,
  },
  filterValue: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#1C1208",
    fontSize: 16,
  },
});

