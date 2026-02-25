import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  EXPECTATIONS_CONFIG,
  EXPECTATIONS_STEPS,
} from "@/constants/expectationsConfig";
import { useExpectations, useSaveExpectations } from "@/lib/hooks/useExpectations";
import { useUserStore } from "@/lib/stores/userStore";

const TOTAL_STEPS = EXPECTATIONS_STEPS.length; // 7

type FormData = {
  financial: Record<string, string>;
  lifestyle: Record<string, string>;
  mahr: Record<string, string>;
  family: Record<string, string>;
  religious: Record<string, string>;
  husband_obligations: Record<string, boolean>;
  wife_obligations: Record<string, boolean>;
  additional_notes: string;
};

const EMPTY_FORM: FormData = {
  financial: {},
  lifestyle: {},
  mahr: {},
  family: {},
  religious: {},
  husband_obligations: {},
  wife_obligations: {},
  additional_notes: "",
};

export default function ExpectationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: existingData, isLoading } = useExpectations();
  const saveExpectations = useSaveExpectations();
  const gender = useUserStore((s) => s.profile?.gender);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [loaded, setLoaded] = useState(false);

  // Pre-fill from existing data
  useEffect(() => {
    if (existingData && !loaded) {
      setForm({
        financial: existingData.financial_expectations || {},
        lifestyle: existingData.lifestyle_expectations || {},
        mahr: existingData.mahr_expectations || {},
        family: existingData.family_expectations || {},
        religious: existingData.religious_expectations || {},
        husband_obligations: existingData.husband_obligations || {},
        wife_obligations: existingData.wife_obligations || {},
        additional_notes: existingData.additional_notes || "",
      });
      setLoaded(true);
    }
  }, [existingData, loaded]);

  const currentStep = EXPECTATIONS_STEPS[step];

  const setField = useCallback(
    (category: keyof FormData, field: string, value: any) => {
      setForm((prev) => ({
        ...prev,
        [category]: { ...(prev[category] as any), [field]: value },
      }));
    },
    []
  );

  const saveCurrentStep = useCallback(
    (complete: boolean) => {
      saveExpectations.mutate({
        expectations: {
          financial: form.financial,
          lifestyle: form.lifestyle,
          mahr: form.mahr,
          family: form.family,
          religious: form.religious,
          husband_obligations: form.husband_obligations,
          wife_obligations: form.wife_obligations,
          additional_notes: form.additional_notes,
        },
        isComplete: complete,
      });
    },
    [form, saveExpectations]
  );

  const handleNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      saveCurrentStep(false);
      setStep((s) => s + 1);
    } else {
      // Final submit
      saveExpectations.mutate(
        {
          expectations: {
            financial: form.financial,
            lifestyle: form.lifestyle,
            mahr: form.mahr,
            family: form.family,
            religious: form.religious,
            husband_obligations: form.husband_obligations,
            wife_obligations: form.wife_obligations,
            additional_notes: form.additional_notes,
          },
          isComplete: true,
        },
        {
          onSuccess: () => {
            router.replace("/(main)/profile/marriage-foundations/certified");
          },
          onError: () => {
            Alert.alert("Error", "Failed to save. Please try again.");
          },
        }
      );
    }
  }, [step, form, saveExpectations, saveCurrentStep, router]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  }, [step, router]);

  // Check if current step has required selections
  const isStepValid = useMemo(() => {
    if (currentStep === "notes") return true;
    if (currentStep === "obligations") {
      const obligations =
        gender === "male" ? form.husband_obligations : form.wife_obligations;
      return Object.values(obligations).some((v) => v === true);
    }
    const config =
      EXPECTATIONS_CONFIG[currentStep as keyof typeof EXPECTATIONS_CONFIG];
    if (!config || !("fields" in config)) return true;
    const data = form[currentStep as keyof FormData] as Record<string, string>;
    const fields = Object.keys(config.fields);
    return fields.every((f) => data[f] !== undefined && data[f] !== "");
  }, [currentStep, form, gender]);

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}
        className="items-center justify-center"
      >
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  const renderSelectField = (
    category: string,
    fieldKey: string,
    field: { label: string; options: readonly { value: string; label: string }[] }
  ) => {
    const data = form[category as keyof FormData] as Record<string, string>;
    const selected = data[fieldKey];

    return (
      <View key={fieldKey} className="mb-6">
        <Text className="text-[#1C1208] text-base font-semibold mb-3">
          {field.label}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {field.options.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setField(category as keyof FormData, fieldKey, opt.value)}
                className={`px-4 py-3 rounded-full border-2 ${
                  isSelected
                    ? "bg-[#B8860B] border-[#B8860B]"
                    : "bg-[#F5F0E8] border-[#EDE5D5]"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isSelected ? "text-black" : "text-white"
                  }`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  const renderObligationsStep = () => {
    const isMale = gender === "male";
    const configKey = isMale ? "husband_obligations" : "wife_obligations";
    const config = EXPECTATIONS_CONFIG[configKey];
    const obligations = isMale
      ? form.husband_obligations
      : form.wife_obligations;

    return (
      <View>
        <View className="flex-row items-center mb-2">
          <Ionicons
            name={config.icon as any}
            size={24}
            color="#B8860B"
          />
          <Text className="text-[#1C1208] text-xl font-bold ml-3">
            {config.title}
          </Text>
        </View>
        <Text className="text-[#9E8E7E] text-sm mb-6">{config.description}</Text>
        <Text className="text-[#6B5D4F] text-sm mb-4">
          Select the obligations you commit to:
        </Text>

        {Object.entries(config.fields).map(([key, field]) => {
          const isChecked = obligations[key] === true;
          return (
            <Pressable
              key={key}
              onPress={() =>
                setField(
                  configKey as keyof FormData,
                  key,
                  !isChecked
                )
              }
              className={`flex-row items-center p-4 rounded-xl mb-3 border-2 ${
                isChecked
                  ? "bg-[#B8860B]/20 border-[#B8860B]"
                  : "bg-[#F5F0E8] border-[#EDE5D5]"
              }`}
            >
              <View
                className={`w-6 h-6 rounded-md items-center justify-center mr-3 ${
                  isChecked ? "bg-[#B8860B]" : "bg-[#F5F0E8]"
                }`}
              >
                {isChecked && (
                  <Ionicons name="checkmark" size={16} color="#000" />
                )}
              </View>
              <Text className="text-[#1C1208] text-base flex-1">{field.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderNotesStep = () => (
    <View>
      <View className="flex-row items-center mb-2">
        <Ionicons name="document-text-outline" size={24} color="#B8860B" />
        <Text className="text-[#1C1208] text-xl font-bold ml-3">
          Additional Notes
        </Text>
      </View>
      <Text className="text-[#9E8E7E] text-sm mb-6">
        Add any additional expectations or clarifications
      </Text>
      <TextInput
        value={form.additional_notes}
        onChangeText={(text) =>
          setForm((prev) => ({ ...prev, additional_notes: text }))
        }
        placeholder="Share any other expectations, deal-breakers, or important notes..."
        placeholderTextColor="rgba(255,255,255,0.3)"
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderWidth: 2,
          borderColor: "#EDE5D5",
          borderRadius: 16,
          padding: 16,
          color: "#1C1208",
          fontSize: 16,
          minHeight: 160,
        }}
      />
    </View>
  );

  const renderCategoryStep = () => {
    const key = currentStep as keyof typeof EXPECTATIONS_CONFIG;
    const config = EXPECTATIONS_CONFIG[key];
    if (!config || !("fields" in config) || !("options" in Object.values(config.fields)[0])) {
      return null;
    }

    return (
      <View>
        <View className="flex-row items-center mb-2">
          <Ionicons name={config.icon as any} size={24} color="#B8860B" />
          <Text className="text-[#1C1208] text-xl font-bold ml-3">
            {config.title}
          </Text>
        </View>
        <Text className="text-[#9E8E7E] text-sm mb-6">{config.description}</Text>

        {Object.entries(config.fields).map(([fieldKey, field]) =>
          renderSelectField(currentStep, fieldKey, field as any)
        )}
      </View>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "obligations":
        return renderObligationsStep();
      case "notes":
        return renderNotesStep();
      default:
        return renderCategoryStep();
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-[#EDE5D5]">
        <Pressable onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#1C1208" />
        </Pressable>
        <Text className="text-[#1C1208] text-base font-semibold">
          Expectations & Obligations
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress bar */}
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-[#6B5D4F] text-sm">
            Step {step + 1} of {TOTAL_STEPS}
          </Text>
          <Text className="text-[#B8860B] text-sm font-semibold">
            {Math.round(((step + 1) / TOTAL_STEPS) * 100)}%
          </Text>
        </View>
        <View className="h-2 bg-[#EDE5D5] rounded-full overflow-hidden">
          <View
            className="h-full bg-[#B8860B] rounded-full"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
      >
        {renderStepContent()}
      </ScrollView>

      {/* Bottom actions */}
      <View
        className="px-4 border-t border-[#EDE5D5]"
        style={{ paddingBottom: insets.bottom + 12, paddingTop: 12 }}
      >
        <Pressable
          onPress={handleNext}
          disabled={!isStepValid || saveExpectations.isPending}
          className={`rounded-xl py-4 px-6 ${
            isStepValid ? "bg-[#B8860B]" : "bg-[#F5F0E8]"
          }`}
        >
          {saveExpectations.isPending ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text
              className={`text-center font-bold text-base ${
                isStepValid ? "text-black" : "text-white/30"
              }`}
            >
              {step === TOTAL_STEPS - 1 ? "Complete & Get Certified" : "Next"}
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
