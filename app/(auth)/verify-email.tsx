import { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";

export default function VerifyEmail() {
  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkVerification();
    
    // Check every 2 seconds if email is verified
    const interval = setInterval(checkVerification, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const checkVerification = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user?.email_confirmed_at) {
      setVerified(true);
      setChecking(false);
      // Small delay before navigating
      setTimeout(() => {
        router.push("/(auth)/onboarding/step1-basic");
      }, 500);
    } else {
      setChecking(false);
    }
  };

  const resendEmail = async () => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: (await supabase.auth.getUser()).data.user?.email || "",
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Verification email sent! Please check your inbox.");
    }
  };

  if (verified) {
    return (
      <View className="flex-1 bg-[#FDFAF5] px-6 justify-center items-center">
        <Text className="text-[#B8860B] text-2xl font-bold mb-4">Email Verified!</Text>
        <Text className="text-[#6B5D4F]">Redirecting...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FDFAF5] px-6 justify-center">
      <Text className="text-[#1C1208] text-3xl font-bold mb-2">Verify Your Email</Text>
      <Text className="text-[#6B5D4F] mb-6">
        We've sent a verification link to your email. Please check your inbox and click the link to verify your account.
      </Text>

      {checking && (
        <View className="items-center mb-6">
          <ActivityIndicator size="large" color="#B8860B" />
          <Text className="text-[#6B5D4F] mt-4">Checking verification status...</Text>
        </View>
      )}

      <Pressable
        className="bg-[#B8860B] p-4 rounded-2xl items-center mb-4"
        onPress={checkVerification}
      >
        <Text className="text-[#1C1208] font-semibold">I've Verified My Email</Text>
      </Pressable>

      <Pressable
        className="bg-[#F5F0E8] p-4 rounded-2xl items-center"
        onPress={resendEmail}
      >
        <Text className="text-[#6B5D4F]">Resend Verification Email</Text>
      </Pressable>
    </View>
  );
}

