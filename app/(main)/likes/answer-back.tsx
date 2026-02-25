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

export default function AnswerBackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { interestRequestId, senderId } = useLocalSearchParams<{
    interestRequestId: string;
    senderId: string;
  }>();

  const respondToInterest = useInterestStore((s) => s.respondToInterest);
  const isSubmitting = useInterestStore((s) => s.isSubmitting);

  const [questions, setQuestions] = useState<IntentQuestion[]>([]);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [senderName, setSenderName] = useState("");

  useEffect(() => {
    const loadQuestions = async () => {
      if (!senderId) return;

      try {
        // Load sender's intent questions
        const { data: questionsData } = await supabase
          .from("intent_questions")
          .select("id, question_text, display_order")
          .eq("user_id", senderId)
          .order("display_order", { ascending: true });

        if (questionsData) setQuestions(questionsData);

        // Load sender name
        const { data: senderData } = await supabase
          .from("users")
          .select("first_name, name")
          .eq("id", senderId)
          .single();

        setSenderName(senderData?.first_name || senderData?.name || "them");
      } catch (e) {
        console.error("Error loading questions:", e);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [senderId]);

  const setAnswer = (questionId: string, text: string) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, text);
    setAnswers(newAnswers);
  };

  const allAnswered = questions.every((q) => answers.get(q.id)?.trim());

  const handleSubmit = async () => {
    if (!allAnswered || !interestRequestId) return;

    const answersList = questions.map((q) => ({
      question_id: q.id,
      answer_text: answers.get(q.id)?.trim() || "",
    }));

    const result = await respondToInterest(
      interestRequestId,
      "answer_back",
      answersList
    );

    if (result.success) {
      // Get current user's photo and sender's photo for celebration screen
      let myPhoto = "";
      let senderPhoto = "";
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: myProfile } = await supabase
            .from("users")
            .select("photos")
            .eq("id", user.id)
            .single();
          myPhoto = myProfile?.photos?.[0] || "";
        }
        if (senderId) {
          const { data: senderProfile } = await supabase
            .from("users")
            .select("photos")
            .eq("id", senderId)
            .single();
          senderPhoto = senderProfile?.photos?.[0] || "";
        }
      } catch {}

      router.replace({
        pathname: "/(main)/matches",
        params: {
          matchId: result.match_id || "",
          otherUserName: senderName,
          otherUserPhoto: senderPhoto,
          myPhoto,
        },
      });
    } else {
      Alert.alert(
        "Error",
        result.error || "Failed to submit answers. Please try again."
      );
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
              Answer {senderName}'s Questions
            </Text>
            <Text className="text-[#9E8E7E] text-sm">
              Answer back to create a match
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
                  className="bg-[#F5F0E8] text-[#1C1208] p-4 rounded-xl border border-[#EDE5D5] text-base"
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
              allAnswered && !isSubmitting ? "bg-[#B8860B]" : "bg-[#EDE5D5]"
            }`}
            onPress={handleSubmit}
            disabled={!allAnswered || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#1C1208" />
            ) : (
              <Text
                className={`text-lg font-bold ${
                  allAnswered ? "text-white" : "text-[#9E8E7E]"
                }`}
              >
                Answer Back & Match
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
