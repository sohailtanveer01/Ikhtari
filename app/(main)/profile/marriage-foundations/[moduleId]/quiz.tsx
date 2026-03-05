import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useModule,
  useModuleQuiz,
  useSubmitQuiz,
} from "@/lib/hooks/useMarriageCourse";

interface QuizResult {
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  answers: Record<string, string>;
}

export default function QuizScreen() {
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: module } = useModule(moduleId);
  const { data: questions, isLoading: questionsLoading } = useModuleQuiz(moduleId);
  const submitQuiz = useSubmitQuiz();

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(
    {}
  );
  const [result, setResult] = useState<QuizResult | null>(null);
  const [showExplanations, setShowExplanations] = useState(false);

  const handleSelectAnswer = (questionId: string, optionId: string) => {
    if (result) return; // Don't allow changes after submission
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = () => {
    if (!questions) return;

    // Check if all questions answered
    const allAnswered = questions.every(
      (q) => selectedAnswers[q.id] !== undefined
    );
    if (!allAnswered) {
      alert("Please answer all questions before submitting.");
      return;
    }

    submitQuiz.mutate(
      { moduleId, answers: selectedAnswers },
      {
        onSuccess: (data) => {
          setResult({
            score: data.score,
            passed: data.passed,
            correctCount: data.correctCount,
            totalQuestions: data.totalQuestions,
            answers: selectedAnswers,
          });
          setShowExplanations(true);
        },
        onError: (error) => {
          alert("Error submitting quiz. Please try again.");
          console.error(error);
        },
      }
    );
  };

  const getOptionStyle = (
    questionId: string,
    optionId: string,
    isCorrect: boolean
  ) => {
    if (!result) {
      // Before submission
      return selectedAnswers[questionId] === optionId
        ? "bg-[#B8860B] border-[#B8860B]"
        : "bg-[#F5F0E8] border-[#EDE5D5]";
    }

    // After submission
    if (isCorrect) {
      return "bg-green-500/30 border-green-500";
    }
    if (selectedAnswers[questionId] === optionId && !isCorrect) {
      return "bg-red-500/30 border-red-500";
    }
    return "bg-[#F5F0E8] border-[#EDE5D5]";
  };

  if (questionsLoading) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}
        className="items-center justify-center"
      >
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}
        className="items-center justify-center px-4"
      >
        <Text className="text-[#1C1208] text-lg mb-4">No quiz questions available</Text>
        <Pressable
          onPress={() => router.navigate(`/(main)/profile/marriage-foundations/${moduleId}`)}
          className="bg-[#B8860B] rounded-xl py-3 px-6"
        >
          <Text className="text-black font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}
      className="flex-1"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-[#EDE5D5]">
        <Pressable onPress={() => router.navigate(`/(main)/profile/marriage-foundations/${moduleId}`)}>
          <Ionicons name="arrow-back" size={24} color="#1C1208" />
        </Pressable>
        <Text className="text-[#1C1208] text-base font-semibold">
          {module?.title} - Quiz
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Result Banner */}
        {result && (
          <View
            className={`mx-4 mt-4 rounded-xl p-4 ${
              result.passed
                ? "bg-green-500/20 border border-green-500/50"
                : "bg-red-500/20 border border-red-500/50"
            }`}
          >
            <View className="flex-row items-center justify-center mb-2">
              <Ionicons
                name={result.passed ? "trophy" : "close-circle"}
                size={32}
                color={result.passed ? "#B8860B" : "#EF4444"}
              />
              <Text
                className={`text-xl font-bold ml-2 ${
                  result.passed ? "text-green-400" : "text-red-400"
                }`}
              >
                {result.passed ? "Quiz Passed!" : "Quiz Not Passed"}
              </Text>
            </View>
            <Text className="text-[#1C1208] text-center text-base">
              You scored {result.score}% ({result.correctCount} out of{" "}
              {result.totalQuestions} correct)
            </Text>
            {!result.passed && (
              <Text className="text-[#6B5D4F] text-center text-sm mt-2">
                You need 80% to pass. You can retake the quiz.
              </Text>
            )}
          </View>
        )}

        {/* Questions */}
        <View className="px-4 py-6">
          {questions.map((question, index) => {
            const options = question.options as Array<{
              id: string;
              text: string;
              is_correct: boolean;
            }>;
            const selectedOption = selectedAnswers[question.id];
            const isCorrect = options.find((opt) => opt.id === selectedOption)
              ?.is_correct;

            return (
              <View key={question.id} className="mb-6">
                <View className="flex-row items-center mb-3">
                  <View className="w-8 h-8 rounded-full bg-[#B8860B] items-center justify-center mr-3">
                    <Text className="text-black font-bold text-sm">
                      {index + 1}
                    </Text>
                  </View>
                  <Text className="text-[#1C1208] text-lg font-semibold flex-1">
                    {question.question_text}
                  </Text>
                </View>

                {/* Options */}
                <View className="ml-11">
                  {options.map((option) => (
                    <Pressable
                      key={option.id}
                      onPress={() => handleSelectAnswer(question.id, option.id)}
                      disabled={!!result}
                      className={`border-2 rounded-xl p-4 mb-3 ${getOptionStyle(
                        question.id,
                        option.id,
                        option.is_correct
                      )}`}
                    >
                      <View className="flex-row items-center">
                        {result && option.is_correct && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#10B981"
                            style={{ marginRight: 8 }}
                          />
                        )}
                        {result &&
                          selectedOption === option.id &&
                          !option.is_correct && (
                            <Ionicons
                              name="close-circle"
                              size={20}
                              color="#EF4444"
                              style={{ marginRight: 8 }}
                            />
                          )}
                        <Text className="text-[#1C1208] text-base flex-1">
                          {option.text}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>

                {/* Explanation */}
                {showExplanations && question.explanation && (
                  <View className="ml-11 bg-[#F5F0E8] rounded-xl p-4 mt-2 border border-[#EDE5D5]">
                    <Text className="text-[#6B5D4F] text-sm">
                      {question.explanation}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Submit Button */}
        {!result && (
          <View className="px-4 pb-6">
            <Pressable
              onPress={handleSubmit}
              disabled={submitQuiz.isPending}
              className="bg-[#B8860B] rounded-xl py-4 px-6"
            >
              {submitQuiz.isPending ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text className="text-black text-center font-bold text-base">
                  Submit Quiz
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Continue/Retake Buttons */}
        {result && (
          <View className="px-4 pb-6">
            {result.passed ? (
              <Pressable
                onPress={() => router.navigate(`/(main)/profile/marriage-foundations/${moduleId}`)}
                className="bg-[#B8860B] rounded-xl py-4 px-6"
              >
                <Text className="text-black text-center font-bold text-base">
                  Continue to Next Module
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setResult(null);
                  setSelectedAnswers({});
                  setShowExplanations(false);
                }}
                className="bg-[#B8860B] rounded-xl py-4 px-6"
              >
                <Text className="text-black text-center font-bold text-base">
                  Retake Quiz
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

