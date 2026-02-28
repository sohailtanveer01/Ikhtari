import { View, Text, Pressable, ScrollView, Platform, KeyboardAvoidingView } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import OnboardingBackground from "@/components/OnboardingBackground";

const SECT_OPTIONS = ["sunni", "shia", "sufi", "other"];
const RELIGIOUS_PRACTICE_OPTIONS = [
  "Prays 5 times a day",
  "actively practicing",
  "moderately practicing",
  "not practicing",
];
const ALCOHOL_OPTIONS = ["never", "socially", "often"];
const SMOKING_OPTIONS = ["never", "socially", "often"];

const TOTAL_STEPS = 9;
const CURRENT_STEP = 2;

export default function Step3Religiosity() {
  const router = useRouter();
  const { data, setData } = useOnboarding();

  const [sect, setSect] = useState(data.sect);
  const [bornMuslim, setBornMuslim] = useState<boolean | null>(data.bornMuslim);
  const [religiousPractice, setReligiousPractice] = useState(data.religiousPractice);
  const [alcoholHabit, setAlcoholHabit] = useState(data.alcoholHabit);
  const [smokingHabit, setSmokingHabit] = useState(data.smokingHabit);
  const [showSectDropdown, setShowSectDropdown] = useState(false);

  const isComplete =
    !!sect &&
    bornMuslim !== null &&
    !!religiousPractice &&
    !!alcoholHabit &&
    !!smokingHabit;

  const next = () => {
    if (!sect || bornMuslim === null || !religiousPractice || !alcoholHabit || !smokingHabit) {
      alert("Please fill all fields.");
      return;
    }
    setData((d) => ({
      ...d,
      sect,
      bornMuslim,
      religiousPractice,
      alcoholHabit,
      smokingHabit,
    }));
    router.push("/onboarding/step3-hobbies");
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
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={true}
      >
      <View className="px-6 pt-2 pb-10">
        {/* Header Section */}
        <View className="mb-10">
          <Text className="text-[#1C1208] text-4xl font-bold mb-3 leading-tight">
            Religiosity
          </Text>
          <Text className="text-[#6B5D4F] text-xl font-medium">
            Tell us a bit about your deen and lifestyle
          </Text>
        </View>

        {/* Sect Dropdown */}
        <View className="mb-8">
          <Text className="text-[#1C1208] text-base font-bold mb-4">
            Sect
          </Text>
          <Pressable
            onPress={() => setShowSectDropdown(!showSectDropdown)}
            className="bg-[#F5F0E8] p-4 rounded-2xl border border-[#eebd2b]/30"
          >
            <Text className="text-[#1C1208] text-lg">
              {sect ? sect.charAt(0).toUpperCase() + sect.slice(1) : "Select sect"}
            </Text>
          </Pressable>
          {showSectDropdown && (
            <View className="bg-[#F5F0E8] rounded-2xl border border-[#eebd2b]/30 mt-2 overflow-hidden">
              {SECT_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    setSect(option);
                    setShowSectDropdown(false);
                  }}
                  className={`p-4 border-b border-[#EDE5D5] ${
                    sect === option ? "bg-[#B8860B]/20" : ""
                  }`}
                >
                  <Text className="text-[#1C1208] text-lg capitalize">{option}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Born Muslim */}
        <View className="mb-8">
          <Text className="text-[#1C1208] text-base font-bold mb-4">
            Born Muslim?
          </Text>
          <View className="flex-row gap-3">
            {[
              { value: true, label: "Yes" },
              { value: false, label: "No" },
            ].map((option) => (
              <Pressable
                key={option.label}
                onPress={() => setBornMuslim(option.value)}
                className={`flex-1 px-4 py-4 rounded-2xl border ${
                  bornMuslim === option.value
                    ? "bg-[#B8860B] border-[#B8860B]"
                    : "bg-[#F5F0E8] border-[#eebd2b]/20"
                }`}
              >
                <Text className={`text-center font-semibold text-lg ${
                  bornMuslim === option.value ? "text-white" : "text-[#1C1208]"
                }`}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Religious Practice */}
        <View className="mb-8">
          <Text className="text-[#1C1208] text-base font-bold mb-4">
            Religious Practice
          </Text>
          <View className="flex-row gap-3 flex-wrap">
            {RELIGIOUS_PRACTICE_OPTIONS.map((practice) => (
              <Pressable
                key={practice}
                onPress={() => setReligiousPractice(practice)}
                className={`px-5 py-3 rounded-full border ${
                  religiousPractice === practice
                    ? "bg-[#B8860B] border-[#B8860B]"
                    : "bg-[#F5F0E8] border-[#eebd2b]/20"
                }`}
              >
                <Text className={`text-center capitalize font-medium ${
                  religiousPractice === practice ? "text-white" : "text-[#1C1208]"
                }`}>
                  {practice}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Habits */}
        <View className="mb-10">


          {/* Alcohol */}
          <View className="mb-6">
            <Text className="text-[#1C1208] text-base font-bold mb-4">
              Alcohol
            </Text>
            <View className="flex-row gap-3 flex-wrap">
              {ALCOHOL_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setAlcoholHabit(option)}
                className={`px-5 py-3 rounded-full border ${
                  alcoholHabit === option
                    ? "bg-[#B8860B] border-[#B8860B]"
                    : "bg-[#F5F0E8] border-[#eebd2b]/20"
                  }`}
                >
                  <Text className={`text-center capitalize font-medium ${
                    alcoholHabit === option ? "text-white" : "text-[#1C1208]"
                  }`}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Smoking */}
          <View>
            <Text className="text-[#1C1208] text-base font-bold mb-4">
              Smoking
            </Text>
            <View className="flex-row gap-3 flex-wrap">
              {SMOKING_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setSmokingHabit(option)}
                className={`px-5 py-3 rounded-full border ${
                  smokingHabit === option
                    ? "bg-[#B8860B] border-[#B8860B]"
                    : "bg-[#F5F0E8] border-[#eebd2b]/20"
                  }`}
                >
                  <Text className={`text-center capitalize font-medium ${
                    smokingHabit === option ? "text-white" : "text-[#1C1208]"
                  }`}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>
      </ScrollView>

      {/* Fixed Buttons */}
      <View className="px-6 pb-8 pt-4">
        {!isComplete && (
          <Pressable
            className="bg-[#F5F0E8] p-5 rounded-2xl items-center mb-3"
            onPress={() => router.push("/onboarding/step3-hobbies")}
          >
            <Text className="text-[#6B5D4F] text-lg font-semibold">Skip</Text>
          </Pressable>
        )}
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
      </KeyboardAvoidingView>
    </OnboardingBackground>
  );
}
