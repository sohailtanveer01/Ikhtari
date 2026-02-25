import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

const REPORT_REASONS = [
  "Inappropriate language",
  "Sexual / explicit content",
  "Harassment or bullying",
  "Fake profile / scam",
  "Disrespectful to religious values",
  "Other",
];

interface ReportBlockModalProps {
  visible: boolean;
  userName: string;
  onClose: () => void;
  onConfirm: (reason: string, details: string) => Promise<void>;
}

export default function ReportBlockModal({
  visible,
  userName,
  onClose,
  onConfirm,
}: ReportBlockModalProps) {
  // Initialize state - step should always be 1 when modal opens
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);

  // Reset step when modal becomes visible - run BEFORE render
  useEffect(() => {
    if (visible) {
      // Immediately reset to step 1 when modal opens
      setStep(1);
      setSelectedReason("");
      setDetails("");
      setSubmitting(false);
    }
  }, [visible]);

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
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setSubmitting(true);
    try {
      await onConfirm(selectedReason, details.trim());
      setStep(4);
      // Auto-close after showing confirmation
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch {
      // Error handling is done in parent component
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedReason("");
    setDetails("");
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            {step !== 4 && step !== 1 && (
              <Pressable onPress={handleBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </Pressable>
            )}
            <Text style={styles.headerTitle}>
              {step === 4 ? "Thank You" : "Report & Block"}
            </Text>
            {step !== 4 && (
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            )}
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Step 1: Reason Selector */}
            {step === 1 && (
              <View>
                <Text style={styles.stepTitle}>
                  Why are you reporting {userName || "this user"}?
                </Text>
                <Text style={styles.stepSubtitle}>
                  Select a reason to help us understand the issue
                </Text>
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
              </View>
            )}

            {/* Step 2: Optional Details */}
            {step === 2 && (
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
            )}

            {/* Step 3: Submit */}
            {step === 3 && (
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
                      onPress={handleClose}
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
                      onPress={handleSubmit}
                      disabled={submitting || !selectedReason}
                    >
                      <Text style={styles.submitButtonText}>
                        {submitting ? "Submitting..." : "Submit Report & Block"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <View style={styles.confirmationContainer}>
                <View style={styles.confirmationIcon}>
                  <Ionicons name="checkmark-circle" size={64} color="#B8860B" />
                </View>
                <Text style={styles.confirmationTitle}>
                  Thanks for helping keep Ikhtari safe 🤍
                </Text>
                <Text style={styles.confirmationSubtitle}>
                  Your report has been submitted and the user has been blocked.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    zIndex: 10000,
    elevation: 10000,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  modalContent: {
    width: "90%",
    maxWidth: 500,
    maxHeight: "80%",
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(184, 134, 11, 0.3)",
    zIndex: 10001,
    elevation: 10001,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
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
    color: "#FFFFFF",
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
    color: "#FFFFFF",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 24,
  },
  reasonsList: {
    width: "100%",
    marginTop: 8,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 12,
  },
  reasonItemSelected: {
    backgroundColor: "rgba(184, 134, 11, 0.2)",
    borderColor: "#B8860B",
  },
  reasonText: {
    fontSize: 16,
    color: "#FFFFFF",
    flex: 1,
  },
  reasonTextSelected: {
    fontWeight: "600",
    color: "#B8860B",
  },
  detailsInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    color: "#FFFFFF",
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
    color: "#FFFFFF",
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
    color: "#FFFFFF",
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  cancelButtonText: {
    color: "#FFFFFF",
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
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmationContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  confirmationIcon: {
    marginBottom: 20,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  confirmationSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
});

