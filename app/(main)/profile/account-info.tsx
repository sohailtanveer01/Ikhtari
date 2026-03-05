import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";

export default function AccountInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");

  useEffect(() => { loadAccountInfo(); }, []);

  const loadAccountInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/(auth)/login"); return; }

      setEmail(user.email || "");
      setCurrentEmail(user.email || "");

      const { data, error } = await supabase
        .from("users")
        .select("first_name, last_name, dob, name")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data.first_name && data.last_name) {
        setFirstName(data.first_name);
        setLastName(data.last_name);
      } else if (data.name) {
        const parts = data.name.split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      }

      setDob(data.dob || "");
    } catch (error) {
      console.error("Error loading account info:", error);
      Alert.alert("Error", "Failed to load account information.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: profileError } = await supabase
        .from("users")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          dob: dob.trim(),
          last_active_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      if (email.trim().toLowerCase() !== currentEmail.toLowerCase()) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim().toLowerCase(),
        });
        if (emailError) throw emailError;

        Alert.alert(
          "Check Your Email",
          "Profile updated. Please check your new email for a confirmation link to complete the email change.",
          [{ text: "OK", onPress: () => router.back() }]
        );
        return;
      }

      Alert.alert("Saved", "Account information updated successfully!");
      router.back();
    } catch (error: any) {
      console.error("Error updating account info:", error);
      Alert.alert("Error", error.message || "Failed to update account information.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FDFAF5", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFAF5" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 18,
          paddingHorizontal: 20,
          backgroundColor: "#FDFAF5",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(184,134,11,0.1)",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: pressed ? "#EDE5D5" : "#F5F0E8",
            alignItems: "center", justifyContent: "center",
            borderWidth: 1, borderColor: "rgba(184,134,11,0.18)",
            marginRight: 14,
          })}
        >
          <Ionicons name="chevron-back" size={22} color="#1C1208" />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#1C1208", letterSpacing: -0.3 }}>
          Account Information
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <SectionLabel label="Name" />
        <View style={groupCard}>
          <FieldInput
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First Name"
            autoCapitalize="words"
          />
          <View style={divider} />
          <FieldInput
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last Name"
            autoCapitalize="words"
          />
        </View>

        {/* Date of Birth */}
        <SectionLabel label="Date of Birth" />
        <View style={groupCard}>
          <FieldInput
            label="Date of Birth"
            value={dob}
            onChangeText={setDob}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            hint="Format: YYYY-MM-DD"
          />
        </View>

        {/* Email */}
        <SectionLabel label="Email Address" />
        <View style={groupCard}>
          <FieldInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            hint="Changing your email will require verification."
          />
        </View>

        {/* Save Button */}
        <Pressable
          onPress={handleUpdateProfile}
          disabled={saving}
          style={({ pressed }) => ({
            marginTop: 32,
            borderRadius: 999,
            overflow: "hidden",
            opacity: saving ? 0.75 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
            shadowColor: "#B8860B",
            shadowOpacity: 0.4,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          })}
        >
          <LinearGradient
            colors={["#E8B820", "#C9980A", "#A87A08"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 17, alignItems: "center", borderRadius: 999 }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 }}>
                Save Changes
              </Text>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontSize: 11, fontWeight: "700", color: "#9E8E7E",
        letterSpacing: 1.8, textTransform: "uppercase",
        marginBottom: 8, marginLeft: 2,
      }}
    >
      {label}
    </Text>
  );
}

function FieldInput({
  label, value, onChangeText, placeholder, autoCapitalize, keyboardType, autoFocus, hint,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  keyboardType?: any;
  autoFocus?: boolean;
  hint?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <View style={{ paddingVertical: 14 }}>
        <Text style={{ fontSize: 11, fontWeight: "700", color: "#9E8E7E", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>
          {label}
        </Text>
        <TextInput
          style={{
            fontSize: 15,
            color: "#1C1208",
            fontWeight: "500",
            paddingVertical: 0,
          }}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#C4B5A5"
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {focused && (
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1.5, backgroundColor: "#B8860B" }} />
        )}
      </View>
      {hint && (
        <Text style={{ fontSize: 11.5, color: "#B0A090", marginBottom: 6, lineHeight: 17 }}>
          {hint}
        </Text>
      )}
    </View>
  );
}

const groupCard: any = {
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  paddingHorizontal: 18,
  marginBottom: 24,
  borderWidth: 1,
  borderColor: "rgba(184,134,11,0.1)",
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

const divider: any = {
  height: 1,
  backgroundColor: "rgba(184,134,11,0.08)",
};
