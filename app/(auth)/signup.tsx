import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";
import Logo from "../../components/Logo";

// Complete OAuth session in web browser
WebBrowser.maybeCompleteAuthSession();

export default function Signup() {
  const router = useRouter();
  
  // Redirect to login screen since we unified login/signup
  useEffect(() => {
    router.replace("/(auth)/login");
  }, [router]);

  // This component is kept for backward compatibility but redirects immediately
  return null;

  const continueWithEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setEmailLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });
    setEmailLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    router.push({ pathname: "/(auth)/email-otp", params: { email: trimmed } });
  };

  // Handle OAuth callback from deep links
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      try {
        const url = new URL(event.url);
        
        // Supabase OAuth redirects use hash fragments
        const hash = url.hash.substring(1); // Remove #
        const hashParams = new URLSearchParams(hash);
        let accessToken = hashParams.get("access_token");
        let refreshToken = hashParams.get("refresh_token");

        // Fallback to query params
        if (!accessToken || !refreshToken) {
          accessToken = url.searchParams.get("access_token");
          refreshToken = url.searchParams.get("refresh_token");
        }

        if (accessToken && refreshToken) {
          // Set the session
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            Alert.alert("Error", "Failed to sign in with Google. Please try again.");
            setGoogleLoading(false);
            return;
          }

          if (session?.user) {
            await handlePostGoogleSignIn(session.user);
          }
        } else {
          // If no tokens in URL, check if Supabase already set the session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (!sessionError && session?.user) {
            await handlePostGoogleSignIn(session.user);
          }
        }
      } catch (error) {
        console.error("Error handling deep link:", error);
        setGoogleLoading(false);
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url && url.includes("auth/callback")) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handlePostGoogleSignIn = async (user: any) => {
    try {
      // Check if user profile exists
      const { data: profile } = await supabase
        .from("users")
        .select("id, name, photos, email")
        .eq("id", user.id)
        .maybeSingle();

      // If profile doesn't exist, don't create it here - let onboarding handle it
      // This prevents errors with required fields like gender, first_name, last_name
      // The onboarding flow will create the profile with all required fields
      if (!profile) {
        // Profile will be created during onboarding with all required fields
        // Just ensure email is set if we have it
      } else if (profile.email !== user.email) {
        // Update email if it changed
        await supabase
          .from("users")
          .update({ email: user.email })
          .eq("id", user.id);
      }

      // Re-fetch profile to check onboarding status
      const { data: updatedProfile } = await supabase
        .from("users")
        .select("id, name, photos, gender, first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();

      setGoogleLoading(false);

      // Check if user has completed onboarding (has required fields filled)
      if (updatedProfile && 
          updatedProfile.first_name && 
          updatedProfile.last_name && 
          updatedProfile.gender && 
          updatedProfile.photos?.length > 0) {
        // User has completed onboarding - go to main app
        router.replace("/(main)/swipe");
      } else {
        // User needs to complete onboarding (new user or incomplete profile)
        router.replace("/(auth)/onboarding/step1-basic");
      }
    } catch (error: any) {
      console.error("Error in post-Google sign-in:", error);
      Alert.alert("Error", "An error occurred. Please try again.");
      setGoogleLoading(false);
    }
  };

  const continueWithGoogle = async () => {
    try {
      setGoogleLoading(true);

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("Supabase URL not configured");
      }

      // Use a simple deep link format that Supabase can handle
      // The scheme is "ikhtari" as defined in app.config.js
      const redirectUrl = "ikhtari://auth/callback";

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            // Removed prompt: "consent" to avoid showing consent screen every time
            // This will use Google's default behavior (only show consent if needed)
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Open the OAuth URL in browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === "success" && result.url) {
          // Supabase redirects with hash fragments, not query params
          // Parse the URL to extract tokens from hash
          const url = new URL(result.url);
          
          // Check hash fragment first (Supabase uses this)
          const hash = url.hash.substring(1); // Remove #
          const hashParams = new URLSearchParams(hash);
          let accessToken = hashParams.get("access_token");
          let refreshToken = hashParams.get("refresh_token");

          // Fallback to query params if hash doesn't have tokens
          if (!accessToken || !refreshToken) {
            accessToken = url.searchParams.get("access_token");
            refreshToken = url.searchParams.get("refresh_token");
          }

          if (accessToken && refreshToken) {
            // Set the session
            const { data: { session }, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              throw sessionError;
            }

            if (session?.user) {
              await handlePostGoogleSignIn(session.user);
            }
          } else {
            // If no tokens in URL, try to get session from Supabase
            // This handles cases where Supabase sets the session automatically
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (!sessionError && session?.user) {
              await handlePostGoogleSignIn(session.user);
            } else {
              throw new Error("Failed to get authentication tokens");
            }
          }
        } else if (result.type === "cancel") {
          setGoogleLoading(false);
        } else {
          setGoogleLoading(false);
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to sign in with Google";
      
      if (errorMessage.includes("redirect_uri_mismatch")) {
        Alert.alert(
          "Configuration Error",
          `Please add this URL to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs:\n\nikhtari://auth/callback`
        );
      } else {
        Alert.alert("Error", errorMessage);
      }
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Gradient Backgrounds - matching onboarding */}
      <LinearGradient
        colors={["rgba(184,134,11,0.18)", "rgba(253,250,245,0)"]}
        style={[styles.gradientBase, styles.gradientTopLeft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(253,250,245,0)", "rgba(184,134,11,0.12)"]}
        style={[styles.gradientBase, styles.gradientBottomRight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />

      {/* Logo at top */}
      <View style={styles.logoContainer}>
        <Logo variant="transparent" width={150} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to find your match</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#777"
          style={styles.input}
          onChangeText={setEmail}
          value={email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <Pressable
          style={[styles.button, emailLoading && styles.buttonDisabled]}
          onPress={continueWithEmail}
          disabled={emailLoading}
        >
          <Text style={styles.buttonText}>
            {emailLoading ? "Sending code..." : "Continue with Email"}
          </Text>
        </Pressable>

        <Text style={styles.helperText}>
          We&apos;ll send a 6-digit code to verify your email.
        </Text>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Sign-In Button */}
        <Pressable
          style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
          onPress={continueWithGoogle}
          disabled={googleLoading || emailLoading}
        >
          <Text style={styles.googleIcon}>🔍</Text>
          <Text style={styles.googleButtonText}>
            {googleLoading ? "Signing in..." : "Continue with Google"}
          </Text>
        </Pressable>

        <Pressable 
          style={styles.linkContainer}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkHighlight}>Log In</Text>
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
    position: "relative",
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
  logoContainer: {
    position: "absolute",
    top: 60,
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
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#B8860B",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#9E8E7E",
    marginBottom: 32,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#F5F0E8",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#1C1208",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#B8860B",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  helperText: {
    fontSize: 13,
    color: "#9E8E7E",
    textAlign: "center",
    marginBottom: 16,
  },
  linkContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  linkText: {
    fontSize: 15,
    color: "#9E8E7E",
  },
  linkHighlight: {
    color: "#B8860B",
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#EDE5D5",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#9E8E7E",
    fontWeight: "500",
  },
  googleButton: {
    backgroundColor: "#F5F0E8",
    borderWidth: 1,
    borderColor: "#EDE5D5",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  googleIcon: {
    fontSize: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1208",
  },
});

