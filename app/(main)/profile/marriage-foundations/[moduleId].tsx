import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { EXPECTATIONS_CONFIG } from "@/constants/expectationsConfig";
import { useExpectations, useSaveExpectations } from "@/lib/hooks/useExpectations";
import {
  useModule,
  useModuleProgress,
  useCompleteModule,
  useCourseModules,
} from "@/lib/hooks/useMarriageCourse";
import { useUserStore } from "@/lib/stores/userStore";

type FormData = Record<string, any>;

// Simple markdown-ish renderer for article content
function ArticleContent({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <View>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <View key={i} style={{ height: 12 }} />;

        // H2
        if (trimmed.startsWith("## ")) {
          return (
            <Text key={i} className="text-[#1C1208] text-xl font-bold mb-3 mt-4">
              {trimmed.replace("## ", "")}
            </Text>
          );
        }
        // H3
        if (trimmed.startsWith("### ")) {
          return (
            <Text key={i} className="text-[#1C1208] text-lg font-semibold mb-2 mt-4">
              {trimmed.replace("### ", "")}
            </Text>
          );
        }
        // Bullet point
        if (trimmed.startsWith("- ")) {
          return (
            <View key={i} className="flex-row items-start mb-1.5 pl-2">
              <Text className="text-[#B8860B] mr-2 mt-0.5">•</Text>
              <Text className="text-[#6B5D4F] text-base flex-1 leading-6">
                {trimmed.replace("- ", "")}
              </Text>
            </View>
          );
        }
        // Numbered list
        const numberedMatch = trimmed.match(/^(\d+)\.\s\*\*(.*?)\*\*\s*[—–-]\s*(.*)/);
        if (numberedMatch) {
          return (
            <View key={i} className="flex-row items-start mb-1.5 pl-2">
              <Text className="text-[#B8860B] mr-2 font-bold">{numberedMatch[1]}.</Text>
              <Text className="text-[#6B5D4F] text-base flex-1 leading-6">
                <Text className="font-bold text-[#1C1208]">{numberedMatch[2]}</Text>
                {" — "}{numberedMatch[3]}
              </Text>
            </View>
          );
        }
        // Bold line (standalone **text**)
        if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
          return (
            <Text key={i} className="text-[#1C1208] font-bold text-base mb-2 mt-2">
              {trimmed.replace(/\*\*/g, "")}
            </Text>
          );
        }
        // Bold prefix **text:** rest
        const boldPrefixMatch = trimmed.match(/^\*\*(.*?)\*\*\s*(.*)/);
        if (boldPrefixMatch) {
          return (
            <Text key={i} className="text-[#6B5D4F] text-base leading-6 mb-2">
              <Text className="font-bold text-[#1C1208]">{boldPrefixMatch[1]}</Text>
              {" "}{boldPrefixMatch[2]}
            </Text>
          );
        }
        // Regular paragraph (handle inline *italic*)
        return (
          <Text key={i} className="text-[#6B5D4F] text-base leading-6 mb-2">
            {trimmed}
          </Text>
        );
      })}
    </View>
  );
}

export default function ModuleDetailScreen() {
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: module, isLoading: moduleLoading } = useModule(moduleId);
  const { data: progress } = useModuleProgress(moduleId);
  const { data: allModules } = useCourseModules();
  const { data: existingExpectations } = useExpectations();
  const completeModule = useCompleteModule();
  const saveExpectations = useSaveExpectations();
  const gender = useUserStore((s) => s.profile?.gender);

  const [form, setForm] = useState<FormData>({});
  const [husbandObligations, setHusbandObligations] = useState<Record<string, boolean>>({});
  const [wifeObligations, setWifeObligations] = useState<Record<string, boolean>>({});
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [formLoaded, setFormLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const category = module?.expectations_category as string | undefined;
  const isCompleted = progress?.module_completed || false;

  // Pre-fill form from existing expectations data
  useEffect(() => {
    if (existingExpectations && !formLoaded && category) {
      if (category === "obligations") {
        setHusbandObligations(existingExpectations.husband_obligations || {});
        setWifeObligations(existingExpectations.wife_obligations || {});
      } else if (category === "notes") {
        setAdditionalNotes(existingExpectations.additional_notes || "");
      } else {
        const dbKey = `${category}_expectations`;
        setForm(existingExpectations[dbKey as keyof typeof existingExpectations] || {});
      }
      setFormLoaded(true);
    }
  }, [existingExpectations, formLoaded, category, gender]);

  // Find next module
  const nextModule = useMemo(() => {
    if (!allModules || !module) return null;
    return allModules.find(
      (m: any) => m.module_number === module.module_number + 1
    );
  }, [allModules, module]);

  const setField = useCallback((field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Check if expectations form is valid
  const isFormValid = useMemo(() => {
    if (!category) return false;
    if (category === "notes") return true;
    if (category === "obligations") {
      // Both sections need at least one selection
      const hasHusband = Object.values(husbandObligations).some((v) => v === true);
      const hasWife = Object.values(wifeObligations).some((v) => v === true);
      return hasHusband && hasWife;
    }
    const config = EXPECTATIONS_CONFIG[category as keyof typeof EXPECTATIONS_CONFIG];
    if (!config || !("fields" in config)) return true;
    const fields = Object.keys(config.fields);
    return fields.every((f) => form[f] !== undefined && form[f] !== "");
  }, [category, form, husbandObligations, wifeObligations]);

  const handleSaveAndContinue = () => {
    if (!category) return;

    const isLastModule = !nextModule;

    const expectations: any = {};
    if (category === "obligations") {
      expectations.husband_obligations = husbandObligations;
      expectations.wife_obligations = wifeObligations;
    } else if (category === "notes") {
      expectations.additional_notes = additionalNotes;
    } else {
      expectations[category] = form;
    }

    saveExpectations.mutate(
      {
        expectations,
        isComplete: isLastModule,
      },
      {
        onSuccess: () => {
          completeModule.mutate(
            { moduleId },
            {
              onSuccess: () => {
                if (isLastModule) {
                  router.replace(
                    "/(main)/profile/marriage-foundations/certified"
                  );
                } else if (nextModule) {
                  router.replace(
                    `/(main)/profile/marriage-foundations/${nextModule.id}`
                  );
                } else {
                  router.replace("/(main)/profile/marriage-foundations");
                }
              },
              onError: () => {
                Alert.alert("Error", "Failed to complete module. Please try again.");
              },
            }
          );
        },
        onError: () => {
          Alert.alert("Error", "Failed to save expectations. Please try again.");
        },
      }
    );
  };

  const handleSaveEdits = () => {
    if (!category) return;

    const expectations: any = {};
    if (category === "obligations") {
      expectations.husband_obligations = husbandObligations;
      expectations.wife_obligations = wifeObligations;
    } else if (category === "notes") {
      expectations.additional_notes = additionalNotes;
    } else {
      expectations[category] = form;
    }

    saveExpectations.mutate(
      { expectations, isComplete: true },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
        onError: () => {
          Alert.alert("Error", "Failed to save changes. Please try again.");
        },
      }
    );
  };

  const isSaving = saveExpectations.isPending || completeModule.isPending;

  // --- Render helpers ---

  const getFieldLabel = (field: any): string => {
    if (gender === "male" && field.male_label) return field.male_label;
    if (gender === "female" && field.female_label) return field.female_label;
    return field.label;
  };

  const renderSelectField = (
    fieldKey: string,
    field: { label: string; male_label?: string; female_label?: string; options: readonly { value: string; label: string }[] }
  ) => {
    const selected = form[fieldKey];
    return (
      <View key={fieldKey} className="mb-6">
        <Text className="text-[#1C1208] text-base font-semibold mb-3">
          {getFieldLabel(field)}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {field.options.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setField(fieldKey, opt.value)}
                className={`px-4 py-3 rounded-full border-2 ${
                  isSelected
                    ? "bg-[#B8860B] border-[#B8860B]"
                    : "bg-[#F5F0E8] border-[#EDE5D5]"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isSelected ? "text-black" : "text-[#1C1208]"
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

  const renderObligationSection = (
    configKey: "husband_obligations" | "wife_obligations",
    obligations: Record<string, boolean>,
    setObligations: (val: Record<string, boolean>) => void,
  ) => {
    const config = EXPECTATIONS_CONFIG[configKey];
    const isMale = gender === "male";
    const title = isMale
      ? (config as any).male_title || config.title
      : (config as any).female_title || config.title;
    const desc = isMale
      ? (config as any).male_description || config.description
      : (config as any).female_description || config.description;

    return (
      <View className="mb-6">
        <View className="flex-row items-center mb-2">
          <Ionicons name={config.icon as any} size={24} color="#B8860B" />
          <Text className="text-[#1C1208] text-xl font-bold ml-3">
            {title}
          </Text>
        </View>
        <Text className="text-[#9E8E7E] text-sm mb-4">{desc}</Text>

        {Object.entries(config.fields).map(([key, field]) => {
          const isChecked = obligations[key] === true;
          return (
            <Pressable
              key={key}
              onPress={() => setObligations({ ...obligations, [key]: !isChecked })}
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

  const renderObligationsForm = () => {
    const isMale = gender === "male";
    // Show your own obligations first, then what you expect from spouse
    const ownKey = isMale ? "husband_obligations" : "wife_obligations";
    const spouseKey = isMale ? "wife_obligations" : "husband_obligations";
    const ownObligations = isMale ? husbandObligations : wifeObligations;
    const setOwnObligations = isMale ? setHusbandObligations : setWifeObligations;
    const spouseObligations = isMale ? wifeObligations : husbandObligations;
    const setSpouseObligations = isMale ? setWifeObligations : setHusbandObligations;

    return (
      <View>
        {renderObligationSection(ownKey, ownObligations, setOwnObligations)}
        <View className="h-px bg-[#EDE5D5] mb-6" />
        {renderObligationSection(spouseKey, spouseObligations, setSpouseObligations)}
      </View>
    );
  };

  const renderNotesForm = () => (
    <View>
      <View className="flex-row items-center mb-2">
        <Ionicons name="document-text-outline" size={24} color="#B8860B" />
        <Text className="text-[#1C1208] text-xl font-bold ml-3">
          Additional Notes
        </Text>
      </View>
      <Text className="text-[#9E8E7E] text-sm mb-6">
        {gender === "male"
          ? "Add any additional commitments, boundaries, or important notes for a prospective wife"
          : gender === "female"
          ? "Add any additional expectations, deal-breakers, or important notes for a prospective husband"
          : "Add any additional expectations or clarifications"}
      </Text>
      <TextInput
        value={additionalNotes}
        onChangeText={setAdditionalNotes}
        placeholder="Share any other expectations, deal-breakers, or important notes..."
        placeholderTextColor="rgba(255,255,255,0.3)"
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        style={{
          backgroundColor: "rgba(184,134,11,0.04)",
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

  const renderCategoryForm = () => {
    if (!category) return null;
    const config = EXPECTATIONS_CONFIG[category as keyof typeof EXPECTATIONS_CONFIG] as any;
    if (!config || !("fields" in config)) return null;

    const firstField = Object.values(config.fields)[0] as any;
    if (!("options" in firstField)) return null;

    const isMale = gender === "male";
    const title = isMale && (config as any).male_title
      ? (config as any).male_title
      : !isMale && (config as any).female_title
      ? (config as any).female_title
      : config.title;
    const description = isMale && (config as any).male_description
      ? (config as any).male_description
      : !isMale && (config as any).female_description
      ? (config as any).female_description
      : config.description;

    return (
      <View>
        <View className="flex-row items-center mb-2">
          <Ionicons name={config.icon as any} size={24} color="#B8860B" />
          <Text className="text-[#1C1208] text-xl font-bold ml-3">
            {title}
          </Text>
        </View>
        <Text className="text-[#9E8E7E] text-sm mb-6">{description}</Text>

        {Object.entries(config.fields).map(([fieldKey, field]) =>
          renderSelectField(fieldKey, field as any)
        )}
      </View>
    );
  };

  const renderExpectationsForm = () => {
    if (!category) return null;
    switch (category) {
      case "obligations":
        return renderObligationsForm();
      case "notes":
        return renderNotesForm();
      default:
        return renderCategoryForm();
    }
  };

  const renderReadOnlyAnswers = () => {
    if (!category) return null;

    // Notes
    if (category === "notes") {
      return (
        <View>
          <View className="flex-row items-center mb-3">
            <Ionicons name="document-text-outline" size={18} color="#B8860B" />
            <Text className="text-[#1C1208] text-base font-semibold ml-2">Additional Notes</Text>
          </View>
          {additionalNotes ? (
            <View className="bg-[#F5F0E8] rounded-xl p-4 border border-[#EDE5D5]">
              <Text className="text-[#1C1208] text-base leading-6">{additionalNotes}</Text>
            </View>
          ) : (
            <Text className="text-[#9E8E7E] text-sm italic">No notes added</Text>
          )}
        </View>
      );
    }

    // Obligations
    if (category === "obligations") {
      const isMale = gender === "male";
      const ownKey = isMale ? "husband_obligations" : "wife_obligations";
      const spouseKey = isMale ? "wife_obligations" : "husband_obligations";
      const ownObl = isMale ? husbandObligations : wifeObligations;
      const spouseObl = isMale ? wifeObligations : husbandObligations;

      const renderOblReadOnly = (configKey: "husband_obligations" | "wife_obligations", obligations: Record<string, boolean>) => {
        const config = EXPECTATIONS_CONFIG[configKey];
        const isMaleGender = gender === "male";
        const title = isMaleGender
          ? (config as any).male_title || config.title
          : (config as any).female_title || config.title;
        const checked = Object.entries(config.fields).filter(([key]) => obligations[key] === true);
        return (
          <View className="mb-5">
            <View className="flex-row items-center mb-3">
              <Ionicons name={config.icon as any} size={18} color="#B8860B" />
              <Text className="text-[#1C1208] text-base font-semibold ml-2">{title}</Text>
            </View>
            {checked.length > 0 ? (
              checked.map(([key, field]) => (
                <View key={key} className="flex-row items-center mb-2 pl-1">
                  <Ionicons name="checkmark-circle" size={16} color="#B8860B" />
                  <Text className="text-[#1C1208] text-sm ml-2">{(field as any).label}</Text>
                </View>
              ))
            ) : (
              <Text className="text-[#9E8E7E] text-sm italic pl-1">None selected</Text>
            )}
          </View>
        );
      };

      return (
        <View>
          {renderOblReadOnly(ownKey as any, ownObl)}
          <View className="h-px bg-[#EDE5D5] mb-5" />
          {renderOblReadOnly(spouseKey as any, spouseObl)}
        </View>
      );
    }

    // Select-field categories (financial, lifestyle, etc.)
    const config = EXPECTATIONS_CONFIG[category as keyof typeof EXPECTATIONS_CONFIG] as any;
    if (!config || !("fields" in config)) return null;

    const isMale = gender === "male";
    const title = isMale && config.male_title
      ? config.male_title
      : !isMale && config.female_title
      ? config.female_title
      : config.title;

    return (
      <View>
        <View className="flex-row items-center mb-4">
          <Ionicons name={config.icon as any} size={20} color="#B8860B" />
          <Text className="text-[#1C1208] text-base font-semibold ml-2">{title}</Text>
        </View>
        {Object.entries(config.fields).map(([fieldKey, field]: [string, any]) => {
          const selectedValue = form[fieldKey];
          const selectedOption = field.options?.find((opt: any) => opt.value === selectedValue);
          const label = isMale && field.male_label
            ? field.male_label
            : !isMale && field.female_label
            ? field.female_label
            : field.label;
          return (
            <View key={fieldKey} className="mb-3 bg-[#F5F0E8] rounded-xl p-4 border border-[#EDE5D5]">
              <Text className="text-[#9E8E7E] text-xs font-semibold mb-2 uppercase tracking-wider">{label}</Text>
              {selectedOption ? (
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="#B8860B" style={{ marginRight: 6 }} />
                  <Text className="text-[#1C1208] text-base font-semibold">{selectedOption.label}</Text>
                </View>
              ) : (
                <Text className="text-[#9E8E7E] text-sm italic">Not answered</Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  if (moduleLoading) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}
        className="items-center justify-center"
      >
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  if (!module) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}
        className="items-center justify-center px-4"
      >
        <Text className="text-[#1C1208] text-lg mb-4">Module not found</Text>
        <Pressable
          onPress={() => router.back()}
          className="bg-[#B8860B] rounded-xl py-3 px-6"
        >
          <Text className="text-black font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isLastModule = !nextModule;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-[#EDE5D5]">
        <Pressable onPress={() => router.navigate("/(main)/profile/marriage-foundations")}>
          <Ionicons name="arrow-back" size={24} color="#1C1208" />
        </Pressable>
        <Text className="text-[#1C1208] text-base font-semibold" numberOfLines={1}>
          Module {module.module_number} of {allModules?.length ?? 8}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View className="px-4 pt-6 pb-2">
          <View className="flex-row items-center mb-3">
            <View className="bg-[#B8860B]/20 rounded-full px-3 py-1 mr-3">
              <Text className="text-[#B8860B] text-xs font-bold">
                MODULE {module.module_number}
              </Text>
            </View>
            {isCompleted && (
              <View className="bg-[#B8860B]/20 rounded-full px-3 py-1 flex-row items-center">
                <Ionicons name="checkmark-circle" size={14} color="#B8860B" />
                <Text className="text-[#B8860B] text-xs font-bold ml-1">
                  COMPLETED
                </Text>
              </View>
            )}
          </View>
          <Text className="text-[#1C1208] text-2xl font-bold mb-2">
            {module.title}
          </Text>
          <Text className="text-[#9E8E7E] text-base mb-4">{module.description}</Text>
        </View>

        {/* Article Content */}
        {module.article_content && (
          <View className="px-4 mb-6">
            <ArticleContent content={module.article_content} />
          </View>
        )}

        {/* Key Takeaways */}
        {module.key_takeaways && module.key_takeaways.length > 0 && (
          <View className="px-4 mb-6">
            <Text className="text-[#1C1208] text-lg font-semibold mb-3">
              Key Takeaways
            </Text>
            {module.key_takeaways.map((takeaway: string, index: number) => (
              <View
                key={index}
                className="bg-[#F5F0E8] rounded-xl p-4 mb-3 flex-row items-start border border-[#EDE5D5]"
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color="#B8860B"
                  style={{ marginTop: 2, marginRight: 12 }}
                />
                <Text className="text-[#1C1208] text-base flex-1">
                  {takeaway}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Inline Expectations Form */}
        {(!isCompleted || isEditing) && (
          <View className="px-4 mb-6">
            <View className="h-px bg-[#EDE5D5] mb-6" />
            <Text className="text-[#B8860B] text-xs font-semibold uppercase tracking-wider mb-4">
              Your Expectations
            </Text>
            {renderExpectationsForm()}
          </View>
        )}

        {/* Saved Answers (read-only when completed) */}
        {isCompleted && !isEditing && category && (
          <View className="px-4 mb-6">
            <View className="h-px bg-[#EDE5D5] mb-6" />
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={16} color="#B8860B" />
                <Text className="text-[#B8860B] text-xs font-semibold uppercase tracking-wider ml-2">
                  Your Saved Answers
                </Text>
              </View>
              <Pressable
                onPress={() => setIsEditing(true)}
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(184,134,11,0.1)", borderRadius: 999, borderWidth: 1, borderColor: "rgba(184,134,11,0.3)" }}
              >
                <Ionicons name="pencil-outline" size={13} color="#B8860B" />
                <Text style={{ color: "#B8860B", fontSize: 12, fontWeight: "700", marginLeft: 4 }}>Edit</Text>
              </Pressable>
            </View>
            {renderReadOnlyAnswers()}
          </View>
        )}

        {/* Bottom spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Save Button — editing a completed module */}
      {isCompleted && isEditing && (
        <View
          className="px-4 border-t border-[#EDE5D5]"
          style={{ paddingBottom: Math.max(insets.bottom, 10) + 90, paddingTop: 12 }}
        >
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => { setFormLoaded(false); setIsEditing(false); }}
              style={{ flex: 1, paddingVertical: 16, borderRadius: 18, alignItems: "center", borderWidth: 1.5, borderColor: "rgba(184,134,11,0.3)", backgroundColor: "rgba(184,134,11,0.06)" }}
            >
              <Text style={{ color: "#B8860B", fontSize: 15, fontWeight: "700" }}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSaveEdits}
              disabled={!isFormValid || isSaving}
              style={({ pressed }) => ({
                flex: 2, borderRadius: 18,
                shadowColor: isFormValid ? "#B8860B" : "transparent",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.5,
                shadowRadius: 16,
                elevation: isFormValid ? 10 : 0,
                opacity: pressed ? 0.88 : 1,
              })}
            >
              {isFormValid ? (
                <LinearGradient
                  colors={["#D4A017", "#B8860B"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 16, paddingHorizontal: 24, borderRadius: 18, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={20} color="#fff" />
                      <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: 0.4 }}>Save Changes</Text>
                    </>
                  )}
                </LinearGradient>
              ) : (
                <View style={{ paddingVertical: 16, paddingHorizontal: 24, borderRadius: 18, alignItems: "center", backgroundColor: "rgba(184,134,11,0.08)", borderWidth: 1.5, borderColor: "rgba(184,134,11,0.2)" }}>
                  <Text style={{ color: "#B8860B", opacity: 0.4, fontSize: 17, fontWeight: "800" }}>Save Changes</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Bottom Save Button */}
      {!isCompleted && (
        <View
          className="px-4 border-t border-[#EDE5D5]"
          style={{ paddingBottom: Math.max(insets.bottom, 10) + 90, paddingTop: 12 }}
        >
          <Pressable
            onPress={handleSaveAndContinue}
            disabled={!isFormValid || isSaving}
            style={({ pressed }) => ({
              borderRadius: 18,
              shadowColor: isFormValid ? "#B8860B" : "transparent",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 16,
              elevation: isFormValid ? 10 : 0,
              opacity: pressed ? 0.88 : 1,
            })}
          >
            {isFormValid ? (
              <LinearGradient
                colors={["#D4A017", "#B8860B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 18, paddingHorizontal: 24, borderRadius: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name={isLastModule ? "ribbon-outline" : "arrow-forward-circle-outline"} size={22} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.4 }}>
                      {isLastModule ? "Complete & Get Certified" : "Save & Continue"}
                    </Text>
                  </>
                )}
              </LinearGradient>
            ) : (
              <View style={{ paddingVertical: 18, paddingHorizontal: 24, borderRadius: 18, alignItems: 'center', backgroundColor: 'rgba(184,134,11,0.08)', borderWidth: 1.5, borderColor: 'rgba(184,134,11,0.2)' }}>
                <Text style={{ color: '#B8860B', opacity: 0.4, fontSize: 17, fontWeight: '800' }}>
                  {isLastModule ? "Complete & Get Certified" : "Save & Continue"}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
