import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Logo from "../../components/Logo";
import { supabase } from "../../lib/supabase";

export default function EmailOTP() {
  const { email, isReactivating } = useLocalSearchParams();
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const emailAddress = (email as string) || "";
  const shouldReactivate = isReactivating === "true";
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (!emailAddress) {
      Alert.alert("Error", "Missing email address. Please start again.", [
        { text: "OK", onPress: () => router.replace("/(auth)/signup") },
      ]);
    }
  }, [emailAddress, router]);


  const handleCodeChange = (text: string, index: number) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, "");

    if (numericText.length > 1) {
      // Handle paste: distribute digits across fields
      const digits = numericText.slice(0, 6).split("");
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);

      // Focus the next empty field or the last field
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();

      // If all 6 digits are filled, dismiss keyboard
      if (newCode.every(d => d !== "")) {
        Keyboard.dismiss();
      }
    } else {
      const newCode = [...code];
      newCode[index] = numericText;
      setCode(newCode);

      // Auto-focus next field if digit entered
      if (numericText && index < 5) {
        inputRefs.current[index + 1]?.focus();
      } else if (numericText && index === 5) {
        // Last field filled, dismiss keyboard
        Keyboard.dismiss();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace to go to previous field
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verify = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit code.");
      return;
    }

    // Dismiss keyboard when verifying
    Keyboard.dismiss();
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email: emailAddress,
      token: fullCode,
      type: "email",
    });
    setVerifying(false);

    if (error) {
      Alert.alert("Error", error.message);
      // Clear code on error
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      return;
    }

    // Auto-link any pending chaperone invite for this email (fire-and-forget)
    supabase.functions.invoke("accept-chaperone-invite").catch(() => {});

    // Handle account reactivation if needed
    if (shouldReactivate) {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { error: activeError } = await supabase
            .from("users")
            .update({ account_active: true })
            .eq("id", currentUser.id);

          if (activeError) {
            console.error("Error setting account to active:", activeError);
            // Non-blocking: continue to login
          }
        }
      } catch (err) {
        console.error("Unexpected error reactivating account:", err);
      }
    }

    // Check if user has completed onboarding
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("id, name, photos")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && profile.name && profile.photos?.length > 0) {
        // User has completed onboarding - go to main app
        router.replace("/(main)/swipe");
      } else {
        // User needs to complete onboarding (new signup)
        router.replace("/(auth)/onboarding/step1-basic");
      }
    } else {
      router.replace("/(auth)/onboarding/step1-basic");
    }
  };

  const resend = async () => {
    setResending(true);
    // Resend OTP - allow user creation in case it's a signup flow
    const { error } = await supabase.auth.signInWithOtp({
      email: emailAddress,
      options: { shouldCreateUser: true },
    });
    setResending(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Sent", "We sent you another code.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Gradients */}
      <LinearGradient
        colors={["rgba(238,189,43,0.65)", "rgba(10,10,10,0)"]}
        style={[styles.gradientBase, styles.gradientTopLeft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(10,10,10,0)", "rgba(238,189,43,0.55)"]}
        style={[styles.gradientBase, styles.gradientBottomRight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />

      {/* Logo at top */}
      <View style={styles.logoContainer}>
        <Logo variant="transparent" width={150} height={150} style="" />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Heading */}
        <Text style={styles.title}>Enter Verification Code</Text>

        {/* Email Display */}
        <Text style={styles.emailText}>{emailAddress}</Text>

        {/* Instructional Text */}
        <Text style={styles.instructionText}>
          We sent a 6-digit code to your email. Please enter it below to continue.
        </Text>

        {/* 6 Input Fields with Glassmorphism */}
        <View style={styles.inputContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[styles.input, digit ? styles.inputFilled : null]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              placeholder="•"
              placeholderTextColor="rgba(255, 255, 255, 0.2)"
            />
          ))}
        </View>

        {/* Resend Section */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn&apos;t receive the code? </Text>
          <Pressable onPress={resend} disabled={resending}>
            <Text style={[styles.resendLink, resending && styles.resendLinkDisabled]}>
              Resend OTP
            </Text>
          </Pressable>
        </View>

        {/* Verify Button */}
        <Pressable
          style={[
            styles.button,
            { opacity: code.join("").length !== 6 ? 0.5 : 1 }
          ]}
          onPress={verify}
          disabled={verifying || code.join("").length !== 6}
        >
          <Text style={styles.buttonText}>
            {verifying ? "Verifying..." : "Verify"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFAF5",
    justifyContent: "center",
    paddingHorizontal: 24,
    position: "relative",
  },
  logoContainer: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  content: {
    zIndex: 1,
    alignItems: "center",
  },
  gradientBase: {
    position: "absolute",
    width: 620,
    height: 620,
    borderRadius: 310,
    opacity: 0.9,
    transform: [{ scale: 1.3 }],
  },
  gradientTopLeft: {
    top: -260,
    left: -220,
  },
  gradientBottomRight: {
    bottom: -260,
    right: -220,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1C1208",
    textAlign: "center",
    marginBottom: 12,
    marginTop: 120,
  },
  emailText: {
    fontSize: 16,
    color: "#B8860B",
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "600",
  },
  instructionText: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  inputContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  input: {
    width: 48,
    height: 64,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(238, 189, 43, 0.3)",
    borderRadius: 8,
    color: "#1C1208",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  inputFilled: {
    borderColor: "rgba(238, 189, 43, 0.6)",
  },
  resendContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  resendText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 14,
  },
  resendLink: {
    color: "#B8860B",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  resendLinkDisabled: {
    opacity: 0.5,
  },
  button: {
    backgroundColor: "#B8860B",
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 400,
  },
  buttonText: {
    color: "#0A0A0A",
    fontSize: 16,
    fontWeight: "bold",
  },
});