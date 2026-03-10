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
      if (session) setHasSession(true);
      setCheckingSession(false);
    };
    checkSession();
  }, []);

  const handlePostOAuthSignIn = useCallback(async (user: any) => {
    try {
      const { data: statusData, error: statusError } = await supabase.functions.invoke("check-user-status", {
        body: { email: user.email }
      });

      if (statusError) {
        console.error("Error checking user status:", statusError);
      } else if (statusData && statusData.exists && statusData.account_active === false) {
        setGoogleLoading(false);
        const { error: activeError } = await supabase
          .from("users")
          .update({ account_active: true })
          .eq("id", user.id);
        if (activeError) console.error("Error reactivating account:", activeError);
      }

      const { data: profile } = await supabase
        .from("users")
        .select("id, name, photos, email")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && profile.email !== user.email) {
        await supabase.from("users").update({ email: user.email }).eq("id", user.id);
      }

      const { data: updatedProfile } = await supabase
        .from("users")
        .select("id, name, photos, gender, first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();

      setGoogleLoading(false);
      setAppleLoading(false);

      // Existing user with complete profile → main app
      if (updatedProfile &&
          updatedProfile.first_name &&
          updatedProfile.last_name &&
          updatedProfile.gender &&
          updatedProfile.photos?.length > 0) {
        router.replace("/(main)/swipe");
        return;
      }

      // No complete profile — check wali/chaperone status before sending to onboarding
      const { data: chaperoneStatus } = await supabase.functions
        .invoke("get-chaperone-status")
        .catch(() => ({ data: null }));

      const wardships: any[] = chaperoneStatus?.wardships || [];
      const hasPendingInvite = wardships.some((w: any) => w.status === "pending");
      const hasActiveWardship = wardships.some((w: any) => w.status === "active");

      if (hasPendingInvite) {
        router.replace("/(auth)/wali-invitation");
      } else if (hasActiveWardship) {
        const hasName = updatedProfile?.first_name || updatedProfile?.name;
        router.replace(hasName ? "/(main)/wali-home" : "/(auth)/wali-onboarding");
      } else {
        router.replace("/(auth)/onboarding/step1-basic");
      }
    } catch (error: any) {
      console.error("Error in post-OAuth sign-in:", error);
      Alert.alert("Error", "An error occurred. Please try again.");
      setGoogleLoading(false);
      setAppleLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      try {
        const url = new URL(event.url);
        const hash = url.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        let accessToken = hashParams.get("access_token");
        let refreshToken = hashParams.get("refresh_token");

        if (!accessToken || !refreshToken) {
          accessToken = url.searchParams.get("access_token");
          refreshToken = url.searchParams.get("refresh_token");
        }

        if (accessToken && refreshToken) {
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) { Alert.alert("Error", "Failed to sign in. Please try again."); setGoogleLoading(false); return; }
          if (session?.user) await handlePostOAuthSignIn(session.user);
        } else {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (!sessionError && session?.user) await handlePostOAuthSignIn(session.user);
        }
      } catch (error) {
        console.error("Error handling deep link:", error);
        setGoogleLoading(false);
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url && url.includes("auth/callback")) handleDeepLink({ url });
    });
    return () => subscription.remove();
  }, [handlePostOAuthSignIn]);

  const continueWithEmail = () => router.push("/(auth)/login");

  const continueWithGoogle = async () => {
    try {
      setGoogleLoading(true);
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) throw new Error("Supabase URL not configured");

      const redirectUrl = "ikhtiar://auth/callback";
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl, queryParams: { access_type: "offline" } },
      });
      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === "success" && result.url) {
          const url = new URL(result.url);

          // PKCE flow — exchange code for session
          const code = url.searchParams.get("code");
          if (code) {
            const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
            if (sessionError) throw sessionError;
            if (session?.user) await handlePostOAuthSignIn(session.user);
            return;
          }

          // Implicit flow — tokens in hash or query params
          const hash = url.hash.substring(1);
          const hashParams = new URLSearchParams(hash);
          let accessToken = hashParams.get("access_token");
          let refreshToken = hashParams.get("refresh_token");
          if (!accessToken || !refreshToken) {
            accessToken = url.searchParams.get("access_token");
            refreshToken = url.searchParams.get("refresh_token");
          }
          if (accessToken && refreshToken) {
            const { data: { session }, error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            if (sessionError) throw sessionError;
            if (session?.user) await handlePostOAuthSignIn(session.user);
          } else {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (!sessionError && session?.user) await handlePostOAuthSignIn(session.user);
            else throw new Error("Failed to get authentication tokens");
          }
        } else if (result.type !== "cancel") {
          setGoogleLoading(false);
        } else {
          setGoogleLoading(false);
        }
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      Alert.alert("Error", error.message || "Failed to sign in with Google");
      setGoogleLoading(false);
    }
  };

  const continueWithApple = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert("Not Available", "Sign in with Apple is only available on iOS devices.");
      return;
    }
    try {
      setAppleLoading(true);
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) throw new Error("Supabase URL not configured");

      const redirectUrl = "ikhtiar://auth/callback";
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === "success" && result.url) {
          const url = new URL(result.url);

          // PKCE flow — exchange code for session
          const code = url.searchParams.get("code");
          if (code) {
            const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
            if (sessionError) throw sessionError;
            if (session?.user) await handlePostOAuthSignIn(session.user);
            return;
          }

          // Implicit flow — tokens in hash or query params
          const hash = url.hash.substring(1);
          const hashParams = new URLSearchParams(hash);
          let accessToken = hashParams.get("access_token");
          let refreshToken = hashParams.get("refresh_token");
          if (!accessToken || !refreshToken) {
            accessToken = url.searchParams.get("access_token");
            refreshToken = url.searchParams.get("refresh_token");
          }
          if (accessToken && refreshToken) {
            const { data: { session }, error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            if (sessionError) throw sessionError;
            if (session?.user) await handlePostOAuthSignIn(session.user);
          } else {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (!sessionError && session?.user) await handlePostOAuthSignIn(session.user);
            else throw new Error("Failed to get authentication tokens");
          }
        } else if (result.type !== "cancel") {
          setAppleLoading(false);
        } else {
          setAppleLoading(false);
        }
      }
    } catch (error: any) {
      console.error("Apple sign-in error:", error);
      Alert.alert("Error", error.message || "Failed to sign in with Apple");
      setAppleLoading(false);
    }
  };

  if (checkingSession) return null;
  if (hasSession) return <Redirect href="/swipe" />;

  return (
    <View style={styles.container}>
      {/* Background gradient — warm gold strip at top fading to clean cream */}
      <LinearGradient
        colors={["#F5E6C0", "#FDFAF5", "#F5E6C0"]}
        style={styles.bgGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />

      {/* Logo at top */}
      <View style={styles.logoContainer}>
        <Logo variant="transparent" width={220} height={220} style="" />
        <Text style={styles.tagline}>
          <Text style={styles.taglineGold}>Complete Your </Text>
          <Text style={styles.taglineDark}>Half Deen</Text>
        </Text>
      </View>

      {/* Content - bottom */}
      <View style={styles.content}>
        {/* Feature highlights */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="heart" size={22} color="#B8860B" />
            </View>
            <Text style={styles.featureText}>Find Your Better Half</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="shield-checkmark" size={22} color="#B8860B" />
            </View>
            <Text style={styles.featureText}>Safe & Secure</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="people" size={22} color="#B8860B" />
            </View>
            <Text style={styles.featureText}>Muslim Community</Text>
          </View>
        </View>

        {/* Buttons */}
        <View>
          {/* Email Button */}
          <Pressable
            style={[styles.emailButtonWrapper, (googleLoading || appleLoading) && styles.buttonDisabled]}
            onPress={continueWithEmail}
            disabled={googleLoading || appleLoading}
          >
            <LinearGradient
              colors={["#D4A017", "#B8860B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emailButton}
            >
              <Ionicons name="mail" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.emailButtonText}>Continue with Email</Text>
            </LinearGradient>
          </Pressable>

          {/* Google Button */}
          <Pressable
            style={[styles.socialButton, (googleLoading || appleLoading) && styles.buttonDisabled]}
            onPress={continueWithGoogle}
            disabled={googleLoading || appleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#B8860B" size="small" />
            ) : (
              <>
                <Image
                  source={{ uri: "https://www.google.com/favicon.ico" }}
                  style={styles.socialLogo}
                  resizeMode="contain"
                />
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {/* Apple Button (iOS only) */}
          {Platform.OS === "ios" && (
            <Pressable
              style={[styles.socialButton, { marginBottom: 0 }, (googleLoading || appleLoading) && styles.buttonDisabled]}
              onPress={continueWithApple}
              disabled={googleLoading || appleLoading}
            >
              {appleLoading ? (
                <ActivityIndicator color="#B8860B" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={20} color="#1C1208" style={styles.buttonIcon} />
                  <Text style={styles.socialButtonText}>Continue with Apple</Text>
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
    backgroundColor: "#FDFAF5",
  },
  bgGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  logoContainer: {
    position: "absolute",
    top: 80,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  tagline: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
    letterSpacing: 0.4,
  },
  taglineGold: {
    color: "#B8860B",
  },
  taglineDark: {
    color: "#1C1208",
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 50,
    zIndex: 10,
  },
  featuresContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  featureItem: {
    alignItems: "center",
    flex: 1,
  },
  featureIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(184,134,11,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(184,134,11,0.2)",
  },
  featureText: {
    fontSize: 12,
    color: "#6B5D4F",
    fontWeight: "500",
    textAlign: "center",
  },
  emailButtonWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  emailButton: {
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    marginRight: 8,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  socialButton: {
    backgroundColor: "#F9F5EE",
    borderWidth: 1,
    borderColor: "#EDE5D5",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 14,
  },
  socialLogo: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1208",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
