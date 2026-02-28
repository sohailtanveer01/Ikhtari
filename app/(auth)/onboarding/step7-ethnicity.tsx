import { View, Text, Pressable, ScrollView, TextInput, Platform, KeyboardAvoidingView, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import OnboardingBackground from "@/components/OnboardingBackground";
import { COUNTRIES, countryFlag } from "@/lib/countries";

const ETHNICITY_OPTIONS = [
  // Expanded set + searchable (kept as user-friendly labels)
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
  "Other",
  "Prefer not to say",
];

const TOTAL_STEPS = 5;
const CURRENT_STEP = 4;

export default function Step7Ethnicity() {
  const router = useRouter();
  const { data, setData } = useOnboarding();

  const [ethnicity, setEthnicity] = useState(data.ethnicity);
  const [nationality, setNationality] = useState(data.nationality);
  const [showEthnicityDropdown, setShowEthnicityDropdown] = useState(false);
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);
  const [ethnicitySearch, setEthnicitySearch] = useState("");
  const [nationalitySearch, setNationalitySearch] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const filteredEthnicities = ETHNICITY_OPTIONS.filter((e) =>
    e.toLowerCase().includes(ethnicitySearch.toLowerCase())
  );

  const filteredCountries = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(nationalitySearch.toLowerCase())
  );

  const selectedCountry = COUNTRIES.find((c) => c.name === nationality) || null;

  const skip = () => {
    // Allow skipping without validation; save whatever is currently selected (if anything)
    setData((d) => ({
      ...d,
      ethnicity: ethnicity || d.ethnicity,
      nationality: nationality || d.nationality,
    }));
    router.push("/onboarding/step5-intent-questions");
  };

  const next = () => {
    if (!ethnicity || !nationality) {
      alert("Please select both ethnicity and nationality.");
      return;
    }
    setData((d) => ({
      ...d,
      ethnicity,
      nationality,
    }));
    router.push("/onboarding/step5-intent-questions");
  };

  return (
    <OnboardingBackground>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      {/* Sticky top bar (Back + progress + step count) */}
      <View className="pt-20 px-6 pb-4">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full border border-[#B8860B] items-center justify-center"
          >
            <Ionicons name="chevron-back" size={20} color="#1C1208" />
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center', marginHorizontal: 16, backgroundColor: 'rgba(184,134,11,0.07)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(184,134,11,0.18)' }}>
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
                  className={`h-1 rounded-full ${
                    isActive ? "bg-[#F5F573] w-8" : "bg-[#B8860B] w-6"
                  }`}
                />
              );
            })}
          </View>

          <Text className="text-[#B8860B] text-xs font-medium" style={{ width: 50, textAlign: "right" }}>
            step {CURRENT_STEP}/{TOTAL_STEPS}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: keyboardVisible ? 24 : 120 }}
        showsVerticalScrollIndicator={true}
      >
      <View className="px-6 pt-2 pb-10">
        {/* Header Section */}
        <View className="mb-10">
          <Text className="text-[#1C1208] text-4xl font-bold mb-3 leading-tight">
            Background
          </Text>
          <Text className="text-[#6B5D4F] text-xl font-medium">
            Tell us about your heritage
          </Text>
        </View>

        {/* Ethnicity Dropdown */}
        <View className="mb-8">
          <Text className="text-[#6B5D4F] text-sm font-medium mb-3 ml-1">
            Ethnicity
          </Text>
          <Pressable
            onPress={() => {
              setShowEthnicityDropdown(!showEthnicityDropdown);
              setShowNationalityDropdown(false);
            }}
            className="bg-[#F5F0E8] p-4 rounded-2xl border border-[#eebd2b]/30"
          >
            <Text className="text-[#1C1208] text-lg">
              {ethnicity || "Select ethnicity"}
            </Text>
          </Pressable>
          {showEthnicityDropdown && (
            <View className="bg-[#F5F0E8] rounded-2xl border border-[#eebd2b]/30 mt-2 overflow-hidden max-h-64">
              {/* Search Input */}
              <View className="p-3 border-b border-[#eebd2b]/20">
                <TextInput
                  className="bg-white text-[#1C1208] p-3 rounded-xl border border-[#eebd2b]/30"
                  placeholder="Search ethnicity..."
                  placeholderTextColor="#BDB0A4"
                  value={ethnicitySearch}
                  onChangeText={setEthnicitySearch}
                  autoFocus={false}
                />
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredEthnicities.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setEthnicity(option);
                      setShowEthnicityDropdown(false);
                      setEthnicitySearch("");
                    }}
                    className={`p-4 border-b border-[#EDE5D5] ${
                      ethnicity === option ? "bg-[#B8860B]/20" : ""
                    }`}
                  >
                    <Text className="text-[#1C1208] text-lg">{option}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Nationality Dropdown */}
        <View className="mb-10">
          <Text className="text-[#6B5D4F] text-sm font-medium mb-3 ml-1">
            Nationality
          </Text>
          <Pressable
            onPress={() => {
              setShowNationalityDropdown(!showNationalityDropdown);
              setShowEthnicityDropdown(false);
            }}
            className="bg-[#F5F0E8] p-4 rounded-2xl border border-[#eebd2b]/30"
          >
            <Text className="text-[#1C1208] text-lg">
              {selectedCountry ? `${countryFlag(selectedCountry.code)} ${selectedCountry.name}` : (nationality || "Select nationality")}
            </Text>
          </Pressable>
          {showNationalityDropdown && (
            <View className="bg-[#F5F0E8] rounded-2xl border border-[#eebd2b]/30 mt-2 overflow-hidden max-h-80">
              {/* Search Input */}
              <View className="p-3 border-b border-[#eebd2b]/20">
                <TextInput
                  className="bg-white text-[#1C1208] p-3 rounded-xl border border-[#eebd2b]/30"
                  placeholder="Search nationality..."
                  placeholderTextColor="#BDB0A4"
                  value={nationalitySearch}
                  onChangeText={setNationalitySearch}
                  autoFocus={false}
                />
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredCountries.map((c) => (
                  <Pressable
                    key={c.code}
                    onPress={() => {
                      setNationality(c.name);
                      setShowNationalityDropdown(false);
                      setNationalitySearch("");
                    }}
                    className={`p-4 border-b border-[#EDE5D5] ${
                      nationality === c.name ? "bg-[#B8860B]/20" : ""
                    }`}
                  >
                    <Text className="text-[#1C1208] text-lg">{countryFlag(c.code)} {c.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
      </ScrollView>

      {/* Fixed Buttons */}
      {!keyboardVisible && (
        <View className="px-6 pb-8 pt-4">
          <Pressable
            className="bg-[#F5F0E8] p-5 rounded-2xl items-center mb-3"
            onPress={skip}
          >
            <Text className="text-[#6B5D4F] text-lg font-semibold">Skip</Text>
          </Pressable>
          <Pressable
            className="bg-[#B8860B] p-5 rounded-2xl items-center shadow-lg"
            onPress={next}
            style={{
              shadowColor: "#B8860B",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Text className="text-white text-lg font-bold">Next</Text>
          </Pressable>
        </View>
      )}
      </KeyboardAvoidingView>
    </OnboardingBackground>
  );
}

