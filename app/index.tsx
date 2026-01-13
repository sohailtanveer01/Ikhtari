import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { Redirect, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Logo from "../components/Logo";
import { supabase } from "../lib/supabase";

// Complete OAuth session in web browser
WebBrowser.maybeCompleteAuthSession();

export default function Home() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (session) {
        // user already logged in → go to swipe page
        setHasSession(true);
      }

      setCheckingSession(false);
    };

    checkSession();
  }, []);

  const handlePostOAuthSignIn = useCallback(async (user: any) => {
    try {
      // Check if user is deactivated
      const { data: statusData, error: statusError } = await supabase.functions.invoke("check-user-status", {
        body: { email: user.email }
      });

      if (statusError) {
        console.error("Error checking user status:", statusError);
      } else if (statusData && statusData.exists && statusData.account_active === false) {
        setGoogleLoading(false);
        // User is deactivated - reactivate account
        const { error: activeError } = await supabase
          .from("users")
          .update({ account_active: true })
          .eq("id", user.id);

        if (activeError) {
          console.error("Error reactivating account:", activeError);
        }
      }

      // Check if user has completed onboarding
      const { data: profile } = await supabase
        .from("users")
        .select("id, name, photos, email")
        .eq("id", user.id)
        .maybeSingle();

      // If profile doesn't exist, create a basic one with Google info
      if (!profile) {
        // Don't create profile here - let user complete onboarding
        // This prevents errors with required fields like gender
        // User will be redirected to onboarding where they can fill all required fields
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
  }, [router]);

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
            await handlePostOAuthSignIn(session.user);
          }
        } else {
          // If no tokens in URL, check if Supabase already set the session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (!sessionError && session?.user) {
            await handlePostOAuthSignIn(session.user);
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
  }, [handlePostOAuthSignIn]);

  const continueWithEmail = () => {
    // Navigate to email input screen
    router.push("/(auth)/login");
  };

  const continueWithGoogle = async () => {
    try {
      setGoogleLoading(true);

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("Supabase URL not configured");
      }

      // Use a simple deep link format that Supabase can handle
      const redirectUrl = "habibiswipe://auth/callback";

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
          const url = new URL(result.url);
          
          // Check hash fragment first (Supabase uses this)
          const hash = url.hash.substring(1);
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
            await handlePostOAuthSignIn(session.user);
          }
        } else {
          // If no tokens in URL, try to get session from Supabase
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (!sessionError && session?.user) {
            await handlePostOAuthSignIn(session.user);
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
      console.error("Google sign-in error:", error);
      const errorMessage = error.message || "Failed to sign in with Google";
      
      if (errorMessage.includes("redirect_uri_mismatch")) {
        Alert.alert(
          "Configuration Error",
          `Please add this URL to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs:\n\nhabibiswipe://auth/callback`
        );
      } else {
        Alert.alert("Error", errorMessage);
      }
      setGoogleLoading(false);
    }
  };

  const continueWithApple = async () => {
    // Apple Sign-In is only available on iOS
    if (Platform.OS !== "ios") {
      Alert.alert("Not Available", "Sign in with Apple is only available on iOS devices.");
      return;
    }

    try {
      setAppleLoading(true);

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("Supabase URL not configured");
      }

      // Use OAuth flow (same as Google) to avoid bundle identifier issues
      const redirectUrl = "habibiswipe://auth/callback";

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: redirectUrl,
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
          const url = new URL(result.url);
          
          // Check hash fragment first (Supabase uses this)
          const hash = url.hash.substring(1);
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
              await handlePostOAuthSignIn(session.user);
            }
          } else {
            // If no tokens in URL, try to get session from Supabase
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (!sessionError && session?.user) {
              await handlePostOAuthSignIn(session.user);
            } else {
              throw new Error("Failed to get authentication tokens");
            }
          }
        } else if (result.type === "cancel") {
          setAppleLoading(false);
        } else {
          setAppleLoading(false);
        }
      }
    } catch (error: any) {
      console.error("Apple sign-in error:", error);
      const errorMessage = error.message || "Failed to sign in with Apple";
      
      if (errorMessage.includes("redirect_uri_mismatch")) {
        Alert.alert(
          "Configuration Error",
          `Please add this URL to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs:\n\nhabibiswipe://auth/callback`
        );
      } else {
        Alert.alert("Error", errorMessage);
      }
      setAppleLoading(false);
    }
  };

  if (checkingSession) return null;

  if (hasSession) {
    return <Redirect href="/swipe" />;
  }

  return (
    <View style={styles.container}>
      {/* Gradient Backgrounds */}
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
        <Text style={styles.tagline}>
          <Text style={styles.taglineGold}>From a Swipe to </Text>
          <Text style={styles.taglineWhite}>Niqah</Text>
        </Text>
      </View>

      {/* Content - Buttons at bottom */}
      <View style={styles.content}>
        {/* Feature highlights */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="heart" size={24} color="#B8860B" />
            </View>
            <Text style={styles.featureText}>Find Your Better Half</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="shield-checkmark" size={24} color="#B8860B" />
            </View>
            <Text style={styles.featureText}>Safe & Secure</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="people" size={24} color="#B8860B" />
            </View>
            <Text style={styles.featureText}>Muslim Community</Text>
          </View>
        </View>

        <View style={styles.buttonsContainer}>
          {/* Email Button */}
          <Pressable
            style={[styles.button, (googleLoading || appleLoading) && styles.buttonDisabled]}
            onPress={continueWithEmail}
            disabled={googleLoading || appleLoading}
          >
            <Ionicons name="mail" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>
              Continue with Email
            </Text>
          </Pressable>

          {/* Google Sign-In Button */}
          <Pressable
            style={[styles.googleButton, (googleLoading || appleLoading) && styles.buttonDisabled]}
            onPress={continueWithGoogle}
            disabled={googleLoading || appleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Image
                  source={{ uri: "https://www.google.com/favicon.ico" }}
                  style={styles.googleLogo}
                  resizeMode="contain"
                />
                <Text style={styles.googleButtonText}>
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>

          {/* Apple Sign-In Button (iOS only) */}
          {Platform.OS === "ios" && (
            <Pressable
              style={[styles.appleButton, (googleLoading || appleLoading) && styles.buttonDisabled]}
              onPress={continueWithApple}
              disabled={googleLoading || appleLoading}
            >
              {appleLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={20} color="#FFFFFF" style={styles.appleIcon} />
                  <Text style={styles.appleButtonText}>
                    Continue with Apple
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
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
  tagline: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
    letterSpacing: 0.5,
    fontFamily: "System",
  },
  taglineGold: {
    color: "#B8860B",
  },
  taglineWhite: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 60,
    zIndex: 10,
  },
  featuresContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  featureItem: {
    alignItems: "center",
    flex: 1,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(184, 134, 11, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(184, 134, 11, 0.3)",
  },
  featureText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
    textAlign: "center",
  },
  buttonsContainer: {
    width: "100%",
  },
  button: {
    backgroundColor: "#B8860B",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonIcon: {
    marginRight: 8,
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
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  googleButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  googleLogo: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  appleButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  appleIcon: {
    marginRight: 8,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
