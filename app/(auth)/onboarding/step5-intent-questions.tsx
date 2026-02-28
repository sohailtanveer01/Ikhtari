import OnboardingBackground from "@/components/OnboardingBackground";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import IntentQuestionsSetup, {
  IntentQuestion,
} from "../../../components/IntentQuestionsSetup";
import { useOnboarding } from "../../../lib/onboardingStore";

const TOTAL_STEPS = 5;
const CURRENT_STEP = 5;

export default function Step5IntentQuestions() {
  const router = useRouter();
  const { data, setData } = useOnboarding();

  const handleSave = (questions: IntentQuestion[]) => {
    setData((d) => ({
      ...d,
      intentQuestions: questions,
    }));
    router.push("/onboarding/done");
  };

  return (
    <OnboardingBackground>
      {/* Sticky top bar */}
      <View className="pt-20 px-6 pb-4">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full border border-[#B8860B] items-center justify-center"
          >
            <Ionicons name="chevron-back" size={20} color="white" />
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

          <Text
            className="text-[#B8860B] text-xs font-medium"
            style={{ width: 50, textAlign: "right" }}
          >
            step {CURRENT_STEP}/{TOTAL_STEPS}
          </Text>
        </View>
      </View>

      <IntentQuestionsSetup
        initialQuestions={(data as any).intentQuestions}
        onSave={handleSave}
      />
    </OnboardingBackground>
  );
}
