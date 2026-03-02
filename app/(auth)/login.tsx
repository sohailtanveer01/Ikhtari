import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Logo from "../../components/Logo";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loginWithEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const { data: statusData, error: statusError } = await supabase.functions.invoke("check-user-status", {
        body: { email: trimmed }
      });

      if (statusError) {
        // Fallback: proceed to login if check fails
      } else if (statusData && statusData.exists && statusData.account_active === false) {
        setLoading(false);
        router.push({ pathname: "/(auth)/reactivate", params: { email: trimmed } });
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { shouldCreateUser: true },
      });

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      router.push({ pathname: "/(auth)/email-otp", params: { email: trimmed } });
    } catch {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background gradient — top warm gold strip fading to clean cream */}
      <LinearGradient
        colors={["#F5E6C0", "#FDFAF5", "#F5E6C0"]}
        style={styles.bgGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />

      {/* Back Button */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#6B5D4F" />
      </Pressable>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Logo variant="transparent" width={130} height={130} style="" />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Enter your email to continue</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              placeholder="Enter your email"
              placeholderTextColor="#B0A090"
              style={styles.input}
              onChangeText={setEmail}
              value={email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
            />
          </View>

          <Pressable
            style={[styles.buttonWrapper, loading && styles.buttonDisabled]}
            onPress={loginWithEmail}
            disabled={loading}
          >
            <LinearGradient
              colors={["#D4A017", "#B8860B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {loading ? "Sending code..." : "Continue with Email"}
              </Text>
            </LinearGradient>
          </Pressable>

          <Text style={styles.helperText}>
            We&apos;ll send a 6-digit code to verify your email.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFAF5",
  },
  bgGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EDE5D5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  logoContainer: {
    position: "absolute",
    top: 48,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "#EDE5D5",
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1C1208",
    textAlign: "center",
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#9E8E7E",
    textAlign: "center",
    marginBottom: 28,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B5D4F",
    marginBottom: 8,
    paddingLeft: 2,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#F9F5EE",
    borderWidth: 1,
    borderColor: "#EDE5D5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1C1208",
  },
  buttonWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  button: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  helperText: {
    fontSize: 13,
    color: "#9E8E7E",
    textAlign: "center",
    lineHeight: 18,
  },
});
