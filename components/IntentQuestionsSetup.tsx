import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  INTENT_QUESTION_CATEGORIES,
  INTENT_QUESTION_LIBRARY,
} from "../constants/intentQuestions";

export interface IntentQuestion {
  id?: string;
  question_text: string;
  is_from_library: boolean;
  library_question_id?: string;
  display_order: number;
}

interface IntentQuestionsSetupProps {
  initialQuestions?: IntentQuestion[];
  onSave: (questions: IntentQuestion[]) => void;
  onCancel?: () => void;
}

export default function IntentQuestionsSetup({
  initialQuestions,
  onSave,
  onCancel,
}: IntentQuestionsSetupProps) {
  const [questions, setQuestions] = useState<IntentQuestion[]>(
    initialQuestions && initialQuestions.length > 0
      ? initialQuestions
      : []
  );
  const [showLibrary, setShowLibrary] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const canAdd = questions.length < 6;
  const canSave = questions.length >= 3;

  const addFromLibrary = (item: typeof INTENT_QUESTION_LIBRARY[0]) => {
    if (!canAdd) return;
    // Check if already added
    if (questions.some((q) => q.library_question_id === item.id)) return;

    setQuestions([
      ...questions,
      {
        question_text: item.text,
        is_from_library: true,
        library_question_id: item.id,
        display_order: questions.length,
      },
    ]);
    setShowLibrary(false);
  };

  const addCustomQuestion = () => {
    if (!canAdd || !customQuestion.trim()) return;
    setQuestions([
      ...questions,
      {
        question_text: customQuestion.trim(),
        is_from_library: false,
        display_order: questions.length,
      },
    ]);
    setCustomQuestion("");
    setShowCustomInput(false);
  };

  const removeQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated.map((q, i) => ({ ...q, display_order: i })));
  };

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= questions.length) return;
    const updated = [...questions];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setQuestions(updated.map((q, i) => ({ ...q, display_order: i })));
  };

  const handleSave = () => {
    if (!canSave) {
      Alert.alert("Minimum 3 questions", "Please add at least 3 questions before saving.");
      return;
    }
    onSave(questions);
  };

  const filteredLibrary = selectedCategory
    ? INTENT_QUESTION_LIBRARY.filter((q) => q.category === selectedCategory)
    : INTENT_QUESTION_LIBRARY;

  const usedLibraryIds = new Set(
    questions.filter((q) => q.library_question_id).map((q) => q.library_question_id)
  );

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pt-2 pb-4">
          <Text className="text-[#1C1208] text-3xl font-bold mb-2">
            Your Intent Questions
          </Text>
          <Text className="text-[#6B5D4F] text-base">
            Set 3-6 questions that someone must answer to express interest in you.
          </Text>
          <Text className="text-[#9E8E7E] text-sm mt-1">
            {questions.length}/6 questions ({Math.max(0, 3 - questions.length)} more needed)
          </Text>
        </View>

        {/* Current Questions */}
        <View className="px-6">
          {questions.map((question, index) => (
            <View
              key={`q-${index}`}
              className="bg-white rounded-2xl border border-[#B8860B]/30 p-4 mb-3"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-[#B8860B] text-xs font-bold mb-1">
                    Question {index + 1}
                  </Text>
                  <Text className="text-[#1C1208] text-base">{question.question_text}</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  {index > 0 && (
                    <Pressable
                      onPress={() => moveQuestion(index, index - 1)}
                      className="p-2"
                    >
                      <Ionicons name="chevron-up" size={18} color="#B8860B" />
                    </Pressable>
                  )}
                  {index < questions.length - 1 && (
                    <Pressable
                      onPress={() => moveQuestion(index, index + 1)}
                      className="p-2"
                    >
                      <Ionicons name="chevron-down" size={18} color="#B8860B" />
                    </Pressable>
                  )}
                  <Pressable onPress={() => removeQuestion(index)} className="p-2">
                    <Ionicons name="close-circle" size={22} color="#ef4444" />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Add Question Button */}
        {canAdd && (
          <View className="px-6 mt-2">
            <Pressable
              className="bg-[#B8860B]/10 border border-[#B8860B]/40 rounded-2xl p-4 items-center"
              onPress={() => setShowLibrary(true)}
            >
              <Ionicons name="add-circle-outline" size={28} color="#B8860B" />
              <Text className="text-[#B8860B] text-base font-semibold mt-1">
                Add Question
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Bottom Buttons */}
      <View className="px-6 pb-8 pt-4">
        {onCancel && (
          <Pressable
            className="bg-[#F5F0E8] p-4 rounded-2xl items-center mb-3 border border-[#EDE5D5]"
            onPress={onCancel}
          >
            <Text className="text-[#6B5D4F] text-lg font-semibold">Cancel</Text>
          </Pressable>
        )}
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={{
            borderRadius: 18,
            shadowColor: canSave ? "#B8860B" : "transparent",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.5,
            shadowRadius: 16,
            elevation: canSave ? 10 : 0,
          }}
        >
          {canSave ? (
            <LinearGradient
              colors={["#D4A017", "#B8860B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 20, borderRadius: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
            >
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>
                Save Questions ({questions.length}/6)
              </Text>
            </LinearGradient>
          ) : (
            <View style={{ paddingVertical: 20, borderRadius: 18, alignItems: 'center', backgroundColor: 'rgba(184,134,11,0.08)', borderWidth: 1.5, borderColor: 'rgba(184,134,11,0.2)' }}>
              <Text style={{ color: '#B8860B', opacity: 0.45, fontSize: 18, fontWeight: '800' }}>
                Save Questions ({questions.length}/6)
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Library Modal */}
      <Modal
        visible={showLibrary}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowLibrary(false);
          setShowCustomInput(false);
        }}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <Pressable
            className="flex-1"
            onPress={() => {
              setShowLibrary(false);
              setShowCustomInput(false);
            }}
          />
          <View className="bg-[#FDFAF5] border-t border-[#EDE5D5] rounded-t-3xl max-h-[80%]">
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
              <Text className="text-[#1C1208] text-xl font-bold">Add Question</Text>
              <Pressable
                onPress={() => {
                  setShowLibrary(false);
                  setShowCustomInput(false);
                }}
              >
                <Ionicons name="close" size={24} color="#1C1208" />
              </Pressable>
            </View>

            {/* Custom Question Input */}
            {showCustomInput ? (
              <View className="px-6 pb-6">
                <TextInput
                  className="bg-white text-[#1C1208] rounded-xl p-4 text-base mb-3 border border-[#EDE5D5]"
                  placeholder="Write your custom question..."
                  placeholderTextColor="#666"
                  value={customQuestion}
                  onChangeText={setCustomQuestion}
                  multiline
                  maxLength={200}
                />
                <View className="flex-row gap-3">
                  <Pressable
                    className="flex-1 bg-[#F5F0E8] p-3 rounded-xl items-center border border-[#EDE5D5]"
                    onPress={() => {
                      setShowCustomInput(false);
                      setCustomQuestion("");
                    }}
                  >
                    <Text className="text-[#6B5D4F] font-semibold">Back</Text>
                  </Pressable>
                  <Pressable
                    className={`flex-1 p-3 rounded-xl items-center ${
                      customQuestion.trim() ? "bg-[#B8860B]" : "bg-[#F5F0E8]"
                    }`}
                    onPress={addCustomQuestion}
                    disabled={!customQuestion.trim()}
                  >
                    <Text
                      className={`font-semibold ${
                        customQuestion.trim() ? "text-white" : "text-white/40"
                      }`}
                    >
                      Add
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                {/* Write Custom Button */}
                <Pressable
                  className="mx-6 mb-4 bg-[#B8860B]/15 border border-[#B8860B]/40 rounded-xl p-3 items-center"
                  onPress={() => setShowCustomInput(true)}
                >
                  <Text className="text-[#B8860B] font-semibold">
                    Write Custom Question
                  </Text>
                </Pressable>

                {/* Category Filter */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="px-6 mb-3"
                  contentContainerStyle={{ gap: 8 }}
                >
                  <Pressable
                    className={`px-3 py-1.5 rounded-full ${
                      !selectedCategory ? "bg-[#B8860B]" : "bg-[#F5F0E8]"
                    }`}
                    onPress={() => setSelectedCategory(null)}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        !selectedCategory ? "text-black" : "text-[#6B5D4F]"
                      }`}
                    >
                      All
                    </Text>
                  </Pressable>
                  {INTENT_QUESTION_CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat}
                      className={`px-3 py-1.5 rounded-full ${
                        selectedCategory === cat ? "bg-[#B8860B]" : "bg-[#F5F0E8]"
                      }`}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          selectedCategory === cat ? "text-black" : "text-[#6B5D4F]"
                        }`}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {/* Library List */}
                <ScrollView className="px-6 pb-8" style={{ maxHeight: 400 }}>
                  {filteredLibrary.map((item) => {
                    const isUsed = usedLibraryIds.has(item.id);
                    return (
                      <Pressable
                        key={item.id}
                        className={`p-4 border-b border-[#EDE5D5] ${
                          isUsed ? "opacity-40" : ""
                        }`}
                        onPress={() => addFromLibrary(item)}
                        disabled={isUsed}
                      >
                        <Text className="text-[#1C1208] text-base">{item.text}</Text>
                        {item.category && (
                          <Text className="text-[#C9BFB5] text-xs mt-1">
                            {item.category}
                          </Text>
                        )}
                        {isUsed && (
                          <Text className="text-[#B8860B] text-xs mt-1">
                            Already added
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
