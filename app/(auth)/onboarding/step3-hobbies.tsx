import { View, Text, Pressable, ScrollView, Platform, KeyboardAvoidingView } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import OnboardingBackground from "@/components/OnboardingBackground";

const HOBBIES = [
  { emoji: "📚", name: "Reading" },
  { emoji: "🎬", name: "Movies" },
  { emoji: "🎵", name: "Music" },
  { emoji: "🎮", name: "Gaming" },
  { emoji: "⚽", name: "Sports" },
  { emoji: "🏋️", name: "Fitness" },
  { emoji: "🥊", name: "Boxing" },
  { emoji: "🍳", name: "Cooking" },
  { emoji: "✈️", name: "Travel" },
  { emoji: "📸", name: "Photography" },
  { emoji: "🎨", name: "Art" },
  { emoji: "🎤", name: "Singing" },
  { emoji: "🎹", name: "Music Instruments" },
  { emoji: "🧘", name: "Yoga" },
  { emoji: "🏃", name: "Running" },
  { emoji: "🚴", name: "Cycling" },
  { emoji: "🏊", name: "Swimming" },
  { emoji: "🎯", name: "Archery" },
  { emoji: "🎲", name: "Board Games" },
  { emoji: "🧩", name: "Puzzles" },
  { emoji: "🛍️", name: "Shopping" },
  { emoji: "🌱", name: "Gardening" },
  { emoji: "🐕", name: "Pets" },
  { emoji: "✍️", name: "Writing" },
  { emoji: "🎪", name: "Theater" },
  { emoji: "🍷", name: "Wine Tasting" },
  { emoji: "☕", name: "Coffee" },
  { emoji: "🍺", name: "Craft Beer" },
  { emoji: "🎣", name: "Fishing" },
  { emoji: "🏔️", name: "Hiking" },
  { emoji: "⛷️", name: "Skiing" },
  { emoji: "🏄", name: "Surfing" },
  { emoji: "🤿", name: "Diving" },
  { emoji: "🎪", name: "Circus" },
  { emoji: "🎭", name: "Drama" },
  { emoji: "💃", name: "Dancing" },
  { emoji: "🎪", name: "Magic" },
  { emoji: "🔬", name: "Science" },
  { emoji: "🌍", name: "Languages" },
  { emoji: "📱", name: "Technology" },
  { emoji: "🚗", name: "Cars" },
  { emoji: "✈️", name: "Aviation" },
  { emoji: "🏰", name: "History" },
  { emoji: "🌌", name: "Astronomy" },
];

const TOTAL_STEPS = 9;
const CURRENT_STEP = 3;

export default function Step4Hobbies() {
  const router = useRouter();
  const { data, setData } = useOnboarding();

  const [selectedHobbies, setSelectedHobbies] = useState<string[]>(data.hobbies || []);

  const isComplete = selectedHobbies.length > 0 && selectedHobbies.length <= 3;

  const toggleHobby = (hobbyName: string) => {
    setSelectedHobbies((prev) => {
      if (prev.includes(hobbyName)) {
        return prev.filter((h) => h !== hobbyName);
      } else {
        if (prev.length >= 3) {
          alert("You can only select up to 3 hobbies.");
          return prev;
        }
        return [...prev, hobbyName];
      }
    });
  };

  const next = () => {
    if (selectedHobbies.length === 0) {
      alert("Please select at least one hobby.");
      return;
    }
    if (selectedHobbies.length > 3) {
      alert("You can only select up to 3 hobbies.");
      return;
    }
    setData((d) => ({
      ...d,
      hobbies: selectedHobbies,
    }));
    router.push("/onboarding/step4-prompts");
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
            Hobbies
          </Text>
          <Text className="text-[#6B5D4F] text-xl font-medium">
            What do you love to do?
          </Text>
        </View>

        {/* Hobbies Grid */}
        <View className="mb-10">
          <Text className="text-[#6B5D4F] text-sm mb-3 ml-1">
            Select up to 3 hobbies ({selectedHobbies.length}/3)
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {HOBBIES.map((hobby) => {
              const isSelected = selectedHobbies.includes(hobby.name);
              const isDisabled = !isSelected && selectedHobbies.length >= 3;
              return (
                <Pressable
                  key={hobby.name}
                  onPress={() => toggleHobby(hobby.name)}
                  disabled={isDisabled}
                  className={`px-4 py-3 rounded-full border ${
                    isSelected
                      ? "bg-[#B8860B] border-[#B8860B]"
                      : isDisabled
                      ? "bg-[#F5F0E8] border-[#eebd2b]/10 opacity-50"
                      : "bg-[#F5F0E8] border-[#eebd2b]/20"
                  }`}
                >
                  <View className="flex-row items-center gap-2">
                    <Text className="text-xl">{hobby.emoji}</Text>
                    <Text className={`text-sm font-medium ${
                      isSelected ? "text-white" : isDisabled ? "text-[#9E8E7E]" : "text-[#1C1208]"
                    }`}>
                      {hobby.name}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      </ScrollView>

      {/* Fixed Buttons */}
      <View className="px-6 pb-8 pt-4">
        {!isComplete && (
          <Pressable
            className="bg-[#F5F0E8] p-5 rounded-2xl items-center mb-3"
            onPress={() => router.push("/onboarding/step4-prompts")}
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

