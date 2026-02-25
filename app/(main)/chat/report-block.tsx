import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";

const REPORT_REASONS = [
  "Inappropriate language",
  "Sexual / explicit content",
  "Harassment or bullying",
  "Fake profile / scam",
  "Disrespectful to religious values",
  "Other",
];

export default function ReportBlockScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    userId: string;
    userName: string;
    matchId?: string;
  }>();

  const userId = params.userId;
  const userName = params.userName || "this user";
  const matchId = params.matchId;

  const [selectedReason, setSelectedReason] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Reason, 2: Details, 3: Submit, 4: Confirmation
  const [submitting, setSubmitting] = useState(false);
  const [wasJustBlock, setWasJustBlock] = useState(false); // Track if user just blocked without reporting

  // Reset state when screen comes into focus - this ensures fresh state every time
  useFocusEffect(
    useCallback(() => {
      // Reset to step 1 every time screen is focused
      setStep(1);
      setSelectedReason("");
      setDetails("");
      setSubmitting(false);
      setWasJustBlock(false);
      
      // Return cleanup function (optional, but good practice)
      return () => {
        // Reset on unmount/focus loss
        setStep(1);
        setSelectedReason("");
        setDetails("");
        setSubmitting(false);
        setWasJustBlock(false);
      };
    }, []) // Empty deps - reset every time screen is focused
  );

  // Also reset when userId param changes (in case same screen is reused with different user)
  useEffect(() => {
    if (userId) {
      setStep(1);
      setSelectedReason("");
      setDetails("");
      setSubmitting(false);
      setWasJustBlock(false);
    }
  }, [userId]);

  const handleReasonSelect = (reason: string) => {
    setSelectedReason(reason);
    // If "Other" is selected, go to details step, otherwise go to submit step
    if (reason === "Other") {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setDetails("");
    } else if (step === 3) {
      if (selectedReason === "Other") {
        setStep(2);
      } else {
        setStep(1);
        setSelectedReason("");
      }
    } else if (step === 1) {
      router.back();
    }
  };

  const handleSubmit = async (justBlock: boolean = false) => {
    if (!userId) return;
    
    // If just blocking, don't require a reason
    if (!justBlock && !selectedReason) return;

    setSubmitting(true);
    setWasJustBlock(justBlock); // Track if this was just a block (no report)

    try {
      const { error } = await supabase.functions.invoke("block-user", {
        body: {
          userId,
          matchId: matchId || null,
          reportReason: justBlock ? null : selectedReason,
          reportDetails: justBlock ? null : (details.trim() || null),
        },
      });

      if (error) {
        Alert.alert("Error", error.message || "Failed to block user. Please try again.");
        throw error;
      }

      // Success - show confirmation
      setStep(4);

      // Invalidate chat list to refresh
      queryClient.invalidateQueries({ queryKey: ["chat-list"] });
      
      // Refresh swipe feed if we came from swipe screen
      queryClient.invalidateQueries({ queryKey: ["swipe-feed"] });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to block user. Please try again.");
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1: // Reason Selector
        return (
          <View>
            <Text style={styles.stepTitle}>
              Why are you reporting {userName}?
            </Text>
            <Text style={styles.stepSubtitle}>
              Select a reason to help us understand the issue
            </Text>

            {/* Report & Block Section */}
            <Text style={styles.sectionHeading}>Report & Block</Text>
            <View style={styles.reasonsList}>
              {REPORT_REASONS.map((reason, index) => (
                <Pressable
                  key={`reason-${index}-${reason}`}
                  style={[
                    styles.reasonItem,
                    selectedReason === reason && styles.reasonItemSelected,
                    index === REPORT_REASONS.length - 1 && { marginBottom: 0 },
                  ]}
                  onPress={() => handleReasonSelect(reason)}
                >
                  <Text
                    style={[
                      styles.reasonText,
                      selectedReason === reason && styles.reasonTextSelected,
                    ]}
                  >
                    {reason}
                  </Text>
                  {selectedReason === reason && (
                    <Ionicons name="checkmark-circle" size={24} color="#B8860B" />
                  )}
                </Pressable>
              ))}
            </View>

            {/* Just Block Section */}
            <View style={styles.justBlockSection}>
              <Text style={styles.sectionHeading}>Just Block</Text>
              <Text style={styles.justBlockSubtitle}>
                Block this user without reporting
              </Text>
              <Pressable
                style={[styles.justBlockButton, submitting && styles.justBlockButtonDisabled]}
                onPress={() => handleSubmit(true)}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.justBlockButtonText}>Block</Text>
                )}
              </Pressable>
            </View>
          </View>
        );

      case 2: // Optional Details
        return (
          <View>
            <Text style={styles.stepTitle}>Tell us what happened</Text>
            <Text style={styles.stepSubtitle}>
              Provide additional details (optional)
            </Text>
            <TextInput
              style={styles.detailsInput}
              placeholder="Tell us what happened (optional)"
              placeholderTextColor="#666"
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>
              {details.length}/500
            </Text>
            <Pressable
              style={[
                styles.nextButton,
                !selectedReason && styles.nextButtonDisabled,
              ]}
              onPress={() => setStep(3)}
              disabled={!selectedReason}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
            </Pressable>
          </View>
        );

      case 3: // Submit
        return (
          <View>
            <Text style={styles.stepTitle}>Review & Submit</Text>
            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Reason:</Text>
              <Text style={styles.reviewValue}>{selectedReason}</Text>
            </View>
            {details && (
              <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Details:</Text>
                <Text style={styles.reviewValue}>{details}</Text>
              </View>
            )}
            <Text style={styles.warningText}>
              This user will be blocked and won&apos;t be able to see your profile or contact you.
            </Text>
            <View style={styles.buttonRow}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => router.back()}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Pressable
                  style={[
                    styles.submitButton,
                    submitting && styles.submitButtonDisabled,
                  ]}
                  onPress={() => handleSubmit(false)}
                  disabled={submitting || !selectedReason}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      Submit Report & Block
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        );

      case 4: // Confirmation
        return (
          <View style={styles.confirmationContainer}>
            <View style={styles.confirmationIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#B8860B" />
            </View>
            <Text style={styles.confirmationTitle}>
              {wasJustBlock ? "User Blocked" : "Thanks for helping keep Ikhtari safe 🤍"}
            </Text>
            <Text style={styles.confirmationSubtitle}>
              {wasJustBlock 
                ? "This user has been blocked and won't be able to see your profile or contact you."
                : "Your report has been submitted and the user has been blocked."}
            </Text>
            <Pressable
              style={styles.doneButton}
              onPress={() => {
                // Reset state before navigating
                setStep(1);
                setSelectedReason("");
                setDetails("");
                setSubmitting(false);
                setWasJustBlock(false);
                // Navigate to swipe screen
                router.replace("/(main)/swipe");
              }}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        {step !== 4 ? (
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1C1208" />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
        <Text style={styles.headerTitle}>
          {step === 4 ? "Thank You" : "Report & Block"}
        </Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStepContent()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFAF5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE5D5",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1C1208",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
    flexGrow: 1,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1C1208",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1C1208",
    marginTop: 8,
    marginBottom: 16,
  },
  reasonsList: {
    width: "100%",
    marginBottom: 32,
  },
  justBlockSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  justBlockSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 16,
  },
  justBlockButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  justBlockButtonDisabled: {
    opacity: 0.5,
  },
  justBlockButtonText: {
    color: "#1C1208",
    fontSize: 16,
    fontWeight: "600",
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EDE5D5",
    marginBottom: 12,
  },
  reasonItemSelected: {
    backgroundColor: "rgba(184, 134, 11, 0.2)",
    borderColor: "#B8860B",
  },
  reasonText: {
    fontSize: 16,
    color: "#1C1208",
    flex: 1,
  },
  reasonTextSelected: {
    fontWeight: "600",
    color: "#B8860B",
  },
  detailsInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EDE5D5",
    borderRadius: 12,
    padding: 16,
    color: "#1C1208",
    fontSize: 16,
    minHeight: 120,
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
    marginBottom: 24,
  },
  nextButton: {
    backgroundColor: "#B8860B",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: "#1C1208",
    fontSize: 16,
    fontWeight: "600",
  },
  reviewSection: {
    marginBottom: 16,
  },
  reviewLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 16,
    color: "#1C1208",
    fontWeight: "500",
  },
  warningText: {
    fontSize: 14,
    color: "#EF4444",
    marginTop: 8,
    marginBottom: 24,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#F5F0E8",
    borderWidth: 1,
    borderColor: "#EDE5D5",
  },
  cancelButtonText: {
    color: "#1C1208",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#EF4444",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#1C1208",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmationContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  confirmationIcon: {
    marginBottom: 20,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1C1208",
    textAlign: "center",
    marginBottom: 12,
  },
  confirmationSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 24,
  },
  doneButton: {
    marginTop: 24,
    backgroundColor: "#B8860B",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  doneButtonText: {
    color: "#1C1208",
    fontSize: 16,
    fontWeight: "600",
  },
});

