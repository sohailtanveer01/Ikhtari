import { View, Text, Pressable, ScrollView, TextInput, Platform, KeyboardAvoidingView, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import OnboardingBackground from "@/components/OnboardingBackground";

const PROFESSION_OPTIONS = [
  "Unemployed",
  "Accountant",
  "Architect",
  "Artist",
  "Business Analyst",
  "Chef",
  "Consultant",
  "Dentist",
  "Designer",
  "Doctor",
  "Engineer",
  "Entrepreneur",
  "Financial Advisor",
  "Graphic Designer",
  "HR Manager",
  "IT Professional",
  "Journalist",
  "Lawyer",
  "Marketing Manager",
  "Nurse",
  "Pharmacist",
  "Photographer",
  "Physician",
  "Project Manager",
  "Real Estate Agent",
  "Sales Manager",
  "Software Developer",
  "Teacher",
  "Therapist",
  "Veterinarian",
  "Writer",
  "Other",
];

const TOTAL_STEPS = 9;
const CURRENT_STEP = 9;

export default function Step8Background() {
  const router = useRouter();
  const { data, setData } = useOnboarding();

  const [education, setEducation] = useState(data.education || "");
  const [profession, setProfession] = useState(data.profession || "");
  const [bio, setBio] = useState(data.bio || "");
  const [showProfessionDropdown, setShowProfessionDropdown] = useState(false);
  const [professionSearch, setProfessionSearch] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const filteredProfessions = PROFESSION_OPTIONS.filter((p) =>
    p.toLowerCase().includes(professionSearch.toLowerCase())
  );

  const skip = () => {
    // Allow skipping without validation; save whatever user typed so far
    setData((d) => ({
      ...d,
      education: education.trim(),
      profession: profession.trim(),
      bio: bio.trim(),
    }));
    router.push("/onboarding/done");
  };

  const validateInputs = (): string | null => {
    // Validate education (optional but if provided, should be reasonable)
    const trimmedEducation = education.trim();
    if (trimmedEducation.length > 100) {
      return "Education must be less than 100 characters.";
    }

    // Validate profession (optional but if provided, should be reasonable)
    const trimmedProfession = profession.trim();
    if (trimmedProfession.length > 100) {
      return "Profession must be less than 100 characters.";
    }

    // Validate bio (optional but if provided, should be reasonable)
    const trimmedBio = bio.trim();
    if (trimmedBio.length > 1000) {
      return "Bio must be less than 1000 characters.";
    }

    return null;
  };

  const next = () => {
    const validationError = validateInputs();
    if (validationError) {
      alert(validationError);
      return;
    }

    setData((d) => ({
      ...d,
      education: education.trim(),
      profession: profession.trim(),
      bio: bio.trim(),
    }));
    router.push("/onboarding/done");
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
            One Last Thing...
          </Text>

          <Text className="text-[#6B5D4F] text-sm">
            Share your education, profession, and a bit about yourself
          </Text>
        </View>

        {/* Education Input */}
        <View className="mb-8">
          <Text className="text-[#6B5D4F] text-sm font-medium mb-3 ml-1">
            Education
          </Text>
          <TextInput
            className="bg-[#F5F0E8] text-[#1C1208] p-4 rounded-2xl border border-[#eebd2b]/40 text-lg"
            placeholder="e.g., Bachelor's in Computer Science"
            placeholderTextColor="#BDB0A4"
            value={education}
            onChangeText={(text) => {
              // Limit to 100 characters
              setEducation(text.slice(0, 100));
            }}
            multiline={false}
            maxLength={100}
          />
          {education.length > 0 && (
            <Text className="text-[#9E8E7E] text-xs mt-2 ml-1">
              {education.length}/100 characters
            </Text>
          )}
        </View>

        {/* Profession Dropdown */}
        <View className="mb-8">
          <Text className="text-[#6B5D4F] text-sm font-medium mb-3 ml-1">
            Profession
          </Text>
          <Pressable
            onPress={() => {
              setShowProfessionDropdown(!showProfessionDropdown);
            }}
            className="bg-[#F5F0E8] p-4 rounded-2xl border border-[#eebd2b]/30"
          >
            <Text className="text-[#1C1208] text-lg">
              {profession || "Select profession"}
            </Text>
          </Pressable>
          {showProfessionDropdown && (
            <View className="bg-[#F5F0E8] rounded-2xl border border-[#eebd2b]/30 mt-2 overflow-hidden max-h-80">
              {/* Search Input */}
              <View className="p-3 border-b border-[#eebd2b]/20">
                <TextInput
                  className="bg-white text-[#1C1208] p-3 rounded-xl border border-[#eebd2b]/30"
                  placeholder="Search profession..."
                  placeholderTextColor="#BDB0A4"
                  value={professionSearch}
                  onChangeText={setProfessionSearch}
                  autoFocus={false}
                />
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredProfessions.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setProfession(option);
                      setShowProfessionDropdown(false);
                      setProfessionSearch("");
                    }}
                    className={`p-4 border-b border-[#EDE5D5] ${
                      profession === option ? "bg-[#B8860B]/20" : ""
                    }`}
                  >
                    <Text className="text-[#1C1208] text-lg">{option}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Bio Input */}
        <View className="mb-10">
          <Text className="text-[#6B5D4F] text-sm font-medium mb-3 ml-1">
            Bio
          </Text>
          <TextInput
            className="bg-[#F5F0E8] text-[#1C1208] p-4 rounded-2xl border border-[#eebd2b]/40 text-lg"
            placeholder="Tell us about yourself..."
            placeholderTextColor="#BDB0A4"
            value={bio}
            onChangeText={(text) => {
              // Limit to 1000 characters
              setBio(text.slice(0, 1000));
            }}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
            style={{ minHeight: 120 }}
          />
          <Text className="text-[#9E8E7E] text-xs mt-2 ml-1">
            {bio.length}/1000 characters
          </Text>
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

