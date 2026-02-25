import OnboardingBackground from "@/components/OnboardingBackground";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { useOnboarding } from "../../../lib/onboardingStore";

const TOTAL_STEPS = 5;
const CURRENT_STEP = 3;

export default function Step6Location() {
  const router = useRouter();
  const { data, setData } = useOnboarding();
  const [loading, setLoading] = useState(false);

  const hasLocation = Boolean(data?.location?.lat) && Boolean(data?.location?.lon);

  const enableLocation = async () => {
    setLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLoading(false);
      alert("Location permission needed to show nearby matches.");
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});

    // Reverse geocode to get city and country
    let city = "";
    let country = "";
    try {
      const reverse = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (reverse && reverse.length > 0) {
        city = reverse[0].city || reverse[0].region || "";
        country = reverse[0].country || "";
      }
    } catch (e) {
      console.error("Error reverse geocoding:", e);
    }

    setData((d) => ({
      ...d,
      location: { lat: loc.coords.latitude, lon: loc.coords.longitude },
      city,
      country,
    }));

    setLoading(false);
    router.push("/onboarding/step7-ethnicity");
  };

  return (
    <OnboardingBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1">
          {/* Header with Back Button and Progress Indicators */}
          <View className="pt-20 px-6 pb-8">
            <View className="flex-row items-center justify-between mb-8">
              {/* Back Button */}
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full border border-[#B8860B] items-center justify-center"
              >
                <Ionicons name="chevron-back" size={20} color="#1C1208" />
              </Pressable>

              {/* Step Indicators - Centered */}
              <View className="flex-row items-center gap-2 flex-1 justify-center px-4">
                {Array.from({ length: 5 }, (_, i) => i + 1).map((indicator) => {
                  const getIndicatorForStep = (step: number) => {
                    if (step <= 5) return step;
                    return 5;
                  };
                  const activeIndicator = getIndicatorForStep(CURRENT_STEP);
                  const isActive = indicator === activeIndicator;
                  return (
                    <View
                      key={indicator}
                      className={`h-1 rounded-full ${isActive ? "bg-[#F5F573] w-8" : "bg-[#B8860B] w-6"
                        }`}
                    />
                  );
                })}
              </View>

              {/* Step Text - Right Aligned */}
              <Text className="text-[#B8860B] text-xs font-medium" style={{ width: 50, textAlign: 'right' }}>
                step {CURRENT_STEP}/{TOTAL_STEPS}
              </Text>
            </View>
          </View>

          <View className="flex-1 px-6 justify-center items-center">
            {/* Location Icon Circle */}
            <View
              className="w-32 h-32 rounded-full items-center justify-center mb-8"
              style={{
                borderWidth: 2,
                borderColor: "#eebd2b", // Golden yellow ring
              }}
            >
              <Ionicons name="location" size={64} color="#eebd2b" />
            </View>

            {/* Heading */}
            <Text className="text-[#1C1208] text-3xl font-bold mb-4 text-center">
              Find Matches Nearby
            </Text>

            {/* Description */}
            <Text className="text-[#6B5D4F] text-base mb-10 text-center px-4">
              Enable your location to connect with people in your area and enhance your matching potential.
            </Text>

            {/* Buttons */}
            <View className="w-full">
              <Pressable
                className="bg-[#B8860B] p-4 rounded-2xl items-center mb-3"
                onPress={enableLocation}
                disabled={loading}
              >
                <Text className="text-white text-lg font-semibold">
                  {loading ? "Getting location..." : "Enable Location"}
                </Text>
              </Pressable>

              {!hasLocation && (
                <Pressable
                  className="bg-[#F5F0E8] p-4 rounded-2xl items-center"
                  onPress={() => router.push("/onboarding/step7-ethnicity")}
                >
                  <Text className="text-[#6B5D4F]">Skip for now</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </OnboardingBackground>
  );
}
