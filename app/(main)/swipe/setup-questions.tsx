import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import IntentQuestionsSetup, {
  IntentQuestion,
} from "../../../components/IntentQuestionsSetup";
import { supabase } from "../../../lib/supabase";

export default function SetupQuestionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  const handleSave = async (questions: IntentQuestion[]) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "save-intent-questions",
        {
          body: {
            questions: questions.map((q) => ({
              question_text: q.question_text,
              is_from_library: q.is_from_library,
              library_question_id: q.library_question_id,
              display_order: q.display_order,
            })),
          },
        }
      );

      if (error) {
        Alert.alert("Error", "Failed to save questions. Please try again.");
        setSaving(false);
        return;
      }

      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (parsed?.error) {
        Alert.alert("Error", parsed.error);
        setSaving(false);
        return;
      }

      // Navigate back - the discover screen will reload and see questions are set
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save questions.");
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <View className="flex-1 bg-[#FDFAF5] items-center justify-center">
        <ActivityIndicator size="large" color="#B8860B" />
        <Text className="text-[#9E8E7E] mt-4">Saving your questions...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FDFAF5]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-3">
        <Pressable
          className="w-10 h-10 rounded-full bg-[#F5F0E8] items-center justify-center mr-3"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#1C1208" />
        </Pressable>
        <Text className="text-[#1C1208] text-xl font-bold">Set Up Questions</Text>
      </View>

      <IntentQuestionsSetup onSave={handleSave} onCancel={() => router.back()} />
    </View>
  );
}
