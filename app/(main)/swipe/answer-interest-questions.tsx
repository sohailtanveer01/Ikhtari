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
import { useInterestStore } from "../../../lib/stores/interestStore";
import { supabase } from "../../../lib/supabase";

interface IntentQuestion {
  id: string;
  question_text: string;
  display_order: number;
}

export default function AnswerInterestQuestionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { interestId } = useLocalSearchParams<{ interestId: string }>();

  const submitInterestAnswers = useInterestStore((s) => s.submitInterestAnswers);
  const isSubmitting = useInterestStore((s) => s.isSubmitting);

  const [questions, setQuestions] = useState<IntentQuestion[]>([]);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [recipientName, setRecipientName] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!interestId) return;
      try {
        // Get the interest request to find recipient
        const { data: request } = await supabase
          .from("interest_requests")
          .select("recipient_id, status")
          .eq("id", interestId)
          .single();

        if (!request) {
          Alert.alert("Error", "Interest request not found.");
          router.back();
          return;
        }

        if (request.status !== "awaiting_answers") {
          Alert.alert("Already answered", "You have already submitted your answers.");
          router.back();
          return;
        }

        // Load recipient profile name
        const { data: recipientData } = await supabase
          .from("users")
          .select("first_name, name")
          .eq("id", request.recipient_id)
          .single();
        setRecipientName(recipientData?.first_name || recipientData?.name || "them");

        // Load recipient's intent questions
        const { data: questionsData } = await supabase
          .from("intent_questions")
          .select("id, question_text, display_order")
          .eq("user_id", request.recipient_id)
          .order("display_order", { ascending: true });

        if (questionsData) setQuestions(questionsData);
      } catch (e) {
        console.error("Error loading questions:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [interestId]);

  const setAnswer = (questionId: string, text: string) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, text);
    setAnswers(newAnswers);
  };

  const allAnswered = questions.length > 0 && questions.every(
    (q) => answers.get(q.id)?.trim()
  );

  const handleSubmit = async () => {
    if (!allAnswered || !interestId) return;

    const answersList = questions.map((q) => ({
      question_id: q.id,
      answer_text: answers.get(q.id)?.trim() || "",
    }));

    const result = await submitInterestAnswers(interestId, answersList);

    if (result.success) {
      Alert.alert(
        "Answers Submitted!",
        `${recipientName} will be notified to review your answers.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } else {
      Alert.alert("Error", result.error || "Failed to submit answers. Please try again.");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#FDFAF5] items-center justify-center">
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View className="flex-1 bg-[#FDFAF5] items-center justify-center px-8">
        <Text className="text-[#1C1208] text-lg font-semibold text-center mb-4">
          No questions to answer
        </Text>
        <Pressable
          className="bg-[#B8860B] px-6 py-3 rounded-full"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
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
              {questions.length} question{questions.length !== 1 ? "s" : ""} to answer
            </Text>
          </View>
        </View>

        {/* Prompt */}
        <View className="mx-5 mb-4 bg-[#FFF8E7] border border-[#B8860B]/30 rounded-2xl px-4 py-3">
          <Text className="text-[#8B6914] text-sm text-center leading-5">
            {recipientName} accepted your interest! Answer their questions honestly to move forward.
          </Text>
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
                <Text className="text-[#B8860B] text-xs font-bold mb-2 uppercase tracking-wider">
                  Question {index + 1}
                </Text>
                <Text className="text-[#1C1208] text-base font-medium mb-4">
                  {question.question_text}
                </Text>
                <TextInput
                  className="bg-white text-[#1C1208] p-4 rounded-xl border border-[#EDE5D5] text-base"
                  placeholder="Write your answer..."
                  placeholderTextColor="#9E8E7E"
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
            borderTopWidth: 1,
            borderTopColor: "rgba(184,134,11,0.15)",
          }}
        >
          <Pressable
            className={`py-4 rounded-2xl items-center ${
              allAnswered && !isSubmitting ? "bg-[#B8860B]" : "bg-[#F5F0E8]"
            }`}
            style={allAnswered && !isSubmitting ? {
              shadowColor: "#B8860B",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            } : {}}
            onPress={handleSubmit}
            disabled={!allAnswered || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#1C1208" />
            ) : (
              <Text
                className={`text-lg font-bold ${
                  allAnswered ? "text-white" : "text-[#C9BFB5]"
                }`}
              >
                Submit Answers
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
