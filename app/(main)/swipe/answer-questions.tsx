import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import { useDiscoverStore } from "../../../lib/stores/discoverStore";
import { useInterestStore } from "../../../lib/stores/interestStore";
import { supabase } from "../../../lib/supabase";

interface IntentQuestion {
  id: string;
  question_text: string;
  display_order: number;
}

export default function AnswerQuestionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recipientId } = useLocalSearchParams<{ recipientId: string }>();

  const submitInterest = useInterestStore((s) => s.submitInterest);
  const isSubmitting = useInterestStore((s) => s.isSubmitting);
  const removeProfile = useDiscoverStore((s) => s.removeProfile);

  const [questions, setQuestions] = useState<IntentQuestion[]>([]);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [recipientName, setRecipientName] = useState("");

  useEffect(() => {
    const loadQuestions = async () => {
      if (!recipientId) return;

      try {
        // Load recipient's questions
        const { data: questionsData } = await supabase
          .from("intent_questions")
          .select("id, question_text, display_order")
          .eq("user_id", recipientId)
          .order("display_order", { ascending: true });

        if (questionsData) setQuestions(questionsData);

        // Load recipient name
        const { data: recipientData } = await supabase
          .from("users")
          .select("first_name, name")
          .eq("id", recipientId)
          .single();

        setRecipientName(
          recipientData?.first_name || recipientData?.name || "them"
        );
      } catch (e) {
        console.error("Error loading questions:", e);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [recipientId]);

  const setAnswer = (questionId: string, text: string) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, text);
    setAnswers(newAnswers);
  };

  const allAnswered = questions.every(
    (q) => answers.get(q.id)?.trim()
  );

  const handleSubmit = async () => {
    if (!allAnswered || !recipientId) return;

    const answersList = questions.map((q) => ({
      question_id: q.id,
      answer_text: answers.get(q.id)?.trim() || "",
    }));

    const result = await submitInterest(recipientId, answersList);

    if (result.success) {
      removeProfile(recipientId);
      Alert.alert(
        "Interest Sent!",
        `Your interest has been sent to ${recipientName}. They'll review your answers and respond.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } else {
      Alert.alert("Error", result.error || "Failed to submit interest. Please try again.");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#FDFAF5] items-center justify-center">
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FDFAF5]" style={{ paddingTop: insets.top }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View className="flex-row items-center px-5 py-3">
          <Pressable
            className="w-10 h-10 rounded-full bg-[#F5F0E8] items-center justify-center mr-3"
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color="#1C1208" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[#1C1208] text-xl font-bold">
              Answer {recipientName}'s Questions
            </Text>
            <Text className="text-[#9E8E7E] text-sm">
              {questions.length} questions to answer
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {questions.map((question, index) => (
            <View key={question.id} className="mb-6">
              <View className="bg-white rounded-2xl border border-[#B8860B]/30 p-5">
                <Text className="text-[#B8860B] text-xs font-bold mb-2">
                  Question {index + 1}
                </Text>
                <Text className="text-[#1C1208] text-base font-medium mb-4">
                  {question.question_text}
                </Text>
                <TextInput
                  className="bg-white text-[#1C1208] p-4 rounded-xl border border-[#EDE5D5] text-base"
                  placeholder="Write your answer..."
                  placeholderTextColor="#666"
                  value={answers.get(question.id) || ""}
                  onChangeText={(text) => setAnswer(question.id, text)}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                  style={{ minHeight: 100 }}
                />
                <Text className="text-[#C9BFB5] text-xs mt-1 text-right">
                  {(answers.get(question.id) || "").length}/500
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Submit Button */}
        <View
          style={{
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 20,
            paddingTop: 12,
            backgroundColor: "rgba(253,250,245,0.97)",
          }}
        >
          <Pressable
            className={`py-4 rounded-2xl items-center ${
              allAnswered && !isSubmitting ? "bg-[#B8860B]" : "bg-[#F5F0E8]"
            }`}
            onPress={handleSubmit}
            disabled={!allAnswered || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#1C1208" />
            ) : (
              <Text
                className={`text-lg font-bold ${
                  allAnswered ? "text-white" : "text-white/40"
                }`}
              >
                Submit Interest
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
