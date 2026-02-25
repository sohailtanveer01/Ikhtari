import OnboardingBackground from "@/components/OnboardingBackground";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useOnboarding } from "../../../lib/onboardingStore";

const DEFAULT_PROMPTS = [
  "Something I’m intentional about in a relationship is…",
  "One thing I'm proud of…",
  "The most spontaneous thing I've done…",
  "A green flag about me…",
  "I hate it when people…",
  "My perfect weekend is…",
  "My best qualities are…",
  "A secret talent I have…",
  "My friends describe me as…",
  "A goal or dua I'm working towards is…",
];

const TOTAL_STEPS = 9;
const CURRENT_STEP = 4;

interface Prompt {
  id: string;
  question: string;
  answer: string;
}

export default function Step5Prompts() {
  const router = useRouter();
  const { data, setData } = useOnboarding();

  // Initialize with 3 empty prompt slots
  const initializePrompts = (): Prompt[] => {
    if (data.prompts && data.prompts.length > 0) {
      const existing = data.prompts.map((p: any, index: number) => ({
        id: p.id || `prompt-${index}`,
        question: p.question || "",
        answer: p.answer || "",
      }));
      // Fill remaining slots up to 3
      while (existing.length < 3) {
        existing.push({
          id: `prompt-${Date.now()}-${existing.length}`,
          question: "",
          answer: "",
        });
      }
      return existing.slice(0, 3);
    }
    // Return 3 empty slots
    return [
      { id: "prompt-0", question: "", answer: "" },
      { id: "prompt-1", question: "", answer: "" },
      { id: "prompt-2", question: "", answer: "" },
    ];
  };

  const [prompts, setPrompts] = useState<Prompt[]>(initializePrompts());
  const [showDropdown, setShowDropdown] = useState<number | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // If user has filled at least one prompt fully, the step is effectively complete (no need to show Skip).
  const isComplete = prompts.some((p) => p.question.trim() && p.answer.trim());

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const clearPrompt = (index: number) => {
    const newPrompts = [...prompts];
    newPrompts[index] = {
      id: `prompt-${index}`,
      question: "",
      answer: "",
    };
    setPrompts(newPrompts);
  };

  const updatePromptQuestion = (id: string, question: string) => {
    setPrompts(
      prompts.map((p) => (p.id === id ? { ...p, question } : p))
    );
    setShowDropdown(null);
  };

  const updatePromptAnswer = (id: string, answer: string) => {
    setPrompts(
      prompts.map((p) => (p.id === id ? { ...p, answer } : p))
    );
  };

  const validatePrompts = (): string | null => {
    // Filter out empty prompts (where both question and answer are empty)
    const filledPrompts = prompts.filter(
      (p) => p.question.trim() && p.answer.trim()
    );
    
    // Validate that all filled prompts have both question and answer
    const incompletePrompts = filledPrompts.filter(
      (p) => !p.question.trim() || !p.answer.trim()
    );
    
    if (incompletePrompts.length > 0) {
      return "Please fill in both the prompt and answer for all prompts you've started.";
    }

    // Validate answer lengths
    for (const prompt of filledPrompts) {
      const trimmedAnswer = prompt.answer.trim();
      if (trimmedAnswer.length > 500) {
        return "Each prompt answer must be less than 500 characters.";
      }
    }

    return null;
  };

  const next = () => {
    const validationError = validatePrompts();
    if (validationError) {
      alert(validationError);
      return;
    }

    // Filter out empty prompts (where both question and answer are empty)
    const filledPrompts = prompts.filter(
      (p) => p.question.trim() && p.answer.trim()
    ).map((p) => ({
      ...p,
      answer: p.answer.trim(),
    }));

    // Save only filled prompts
    setData((d) => ({
      ...d,
      prompts: filledPrompts,
    }));
    router.push("/onboarding/step5-intent-questions");
  };

  return (
    <OnboardingBackground>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
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

        <ScrollView
          className="flex-1"
          // When keyboard is open, don't reserve a huge bottom gap (it crushes the typing area)
          contentContainerStyle={{ paddingBottom: keyboardVisible ? 48 : 200 }}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View className="px-6 pt-2 pb-8">
            <View className="mb-10">
              <Text className="text-[#1C1208] text-4xl font-bold mb-3 leading-tight">
                Add Your Prompts
              </Text>
              <Text className="text-[#6B5D4F] text-xl font-medium">
                Choose up to 3 prompts and write your answers
              </Text>
            </View>
          </View>

          <View className="px-6 pb-10">
            {/* All 3 Prompt Slots */}
            {prompts.map((prompt, index) => (
              <View key={prompt.id} className="mb-6">
                <View className="bg-[#F5F0E8] rounded-2xl border border-[#eebd2b]/30 p-4">
                  {/* Prompt Header with Clear Button */}
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-[#1C1208] text-base font-bold">
                      Prompt {index + 1}
                    </Text>
                    {(prompt.question || prompt.answer) && (
                      <Pressable
                        onPress={() => clearPrompt(index)}
                        className="p-2"
                      >
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                      </Pressable>
                    )}
                  </View>

                  {/* Prompt Question Dropdown */}
                  <View className="mb-4">
                    <Text className="text-[#6B5D4F] text-sm font-medium mb-2">
                      Select a prompt
                    </Text>
                    <Pressable
                      onPress={() => setShowDropdown(showDropdown === index ? null : index)}
                      className="bg-white p-4 rounded-xl border border-[#eebd2b]/30"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className={`text-base ${
                          prompt.question ? "text-[#1C1208]" : "text-[#9E8E7E]"
                        }`}>
                          {prompt.question || DEFAULT_PROMPTS[index] || DEFAULT_PROMPTS[0]}
                        </Text>
                        <Ionicons
                          name={showDropdown === index ? "chevron-up" : "chevron-down"}
                          size={20}
                          color="#eebd2b"
                        />
                      </View>
                    </Pressable>

                    {/* Dropdown Options */}
                    {showDropdown === index && (
                      <View className="bg-white rounded-xl border border-[#eebd2b]/30 mt-2 overflow-hidden max-h-64">
                        <ScrollView showsVerticalScrollIndicator={true}>
                          {DEFAULT_PROMPTS.map((option) => {
                            // Check if this prompt is already used in another slot
                            const isUsed = prompts.some(
                              (p, i) => i !== index && p.question === option
                            );
                            return (
                              <Pressable
                                key={option}
                                onPress={() => updatePromptQuestion(prompt.id, option)}
                                disabled={isUsed}
                                className={`p-4 border-b border-[#EDE5D5] ${
                                  prompt.question === option
                                    ? "bg-[#B8860B]/20"
                                    : isUsed
                                    ? "opacity-50"
                                    : ""
                                }`}
                              >
                                <View className="flex-row items-center justify-between">
                                  <Text className={`text-base ${
                                    prompt.question === option
                                      ? "text-[#1C1208] font-semibold"
                                      : isUsed
                                      ? "text-[#9E8E7E]"
                                      : "text-[#1C1208]"
                                  }`}>
                                    {option}
                                  </Text>
                                  {isUsed && (
                                    <Text className="text-[#9E8E7E] text-xs">(Used)</Text>
                                  )}
                                </View>
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Answer Input */}
                  {prompt.question && (
                    <View>
                      <Text className="text-[#6B5D4F] text-sm font-medium mb-2">
                        Your answer
                      </Text>
                      <TextInput
                        className="bg-white text-[#1C1208] p-4 rounded-xl border border-[#eebd2b]/30 text-base"
                        placeholder="Write your answer here..."
                        placeholderTextColor="#BDB0A4"
                        value={prompt.answer}
                        onChangeText={(text) => {
                          // Limit to 500 characters
                          const limited = text.slice(0, 500);
                          updatePromptAnswer(prompt.id, limited);
                        }}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        maxLength={500}
                        style={{ minHeight: 100 }}
                      />
                      <Text className="text-[#9E8E7E] text-xs mt-2 ml-1">
                        {prompt.answer.length}/500 characters
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Fixed Buttons (hide both while keyboard is open) */}
        {!keyboardVisible && (
          <View className="px-6 pb-8 pt-4">
            {!isComplete && (
              <Pressable
                className="bg-[#F5F0E8] p-5 rounded-2xl items-center mb-3"
                onPress={() => router.push("/onboarding/step5-photos")}
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
        )}
      </KeyboardAvoidingView>
    </OnboardingBackground>
  );
}

