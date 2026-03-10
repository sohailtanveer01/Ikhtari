import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

export default function WaliOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!firstName.trim()) {
      Alert.alert("Required", "Please enter your first name.");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("users")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      router.replace("/(main)/wali-home");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FDFAF5" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={["#FFF2B8", "#FDF8EE", "#FDFAF5"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />

      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 28,
        }}
      >
        {/* Icon */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: "rgba(184,134,11,0.12)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1.5,
              borderColor: "rgba(184,134,11,0.3)",
              marginBottom: 20,
            }}
          >
            <Ionicons name="shield-checkmark" size={34} color="#B8860B" />
          </View>

          <Text
            style={{
              fontSize: 26,
              fontWeight: "700",
              color: "#1C1208",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            You're a Wali
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#9E8E7E",
              textAlign: "center",
              lineHeight: 21,
            }}
          >
            Your ward has invited you to chaperon their conversations.{"\n"}
            Please enter your name so they can recognise you.
          </Text>
        </View>

        {/* Fields */}
        <View style={{ gap: 14, marginBottom: 32 }}>
          <View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#6B5D4F",
                marginBottom: 8,
                letterSpacing: 0.5,
              }}
            >
              FIRST NAME *
            </Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="e.g. Ahmed"
              placeholderTextColor="#C4B8A8"
              autoCapitalize="words"
              style={{
                backgroundColor: "#FFFFFF",
                borderWidth: 1.5,
                borderColor: firstName ? "#B8860B" : "#EDE5D5",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: "#1C1208",
              }}
            />
          </View>

          <View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#6B5D4F",
                marginBottom: 8,
                letterSpacing: 0.5,
              }}
            >
              LAST NAME
            </Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="e.g. Al-Rashid"
              placeholderTextColor="#C4B8A8"
              autoCapitalize="words"
              style={{
                backgroundColor: "#FFFFFF",
                borderWidth: 1.5,
                borderColor: lastName ? "#B8860B" : "#EDE5D5",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: "#1C1208",
              }}
            />
          </View>
        </View>

        {/* Continue button */}
        <Pressable
          onPress={handleContinue}
          disabled={saving || !firstName.trim()}
          style={({ pressed }) => ({
            backgroundColor:
              !firstName.trim() ? "#EDE5D5" : pressed ? "#9A7009" : "#B8860B",
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
          })}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: !firstName.trim() ? "#9E8E7E" : "#FFFFFF",
            }}
          >
            {saving ? "Saving..." : "Continue to Dashboard"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
