import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import Purchases from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";

function FeatureItem({ text }: { text: string }) {
  return (
    <View className="flex-row items-center mb-4">
      <View className="w-6 h-6 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
        <Ionicons name="checkmark" size={16} color="#B8860B" />
      </View>
      <Text className="text-[#1C1208] text-base">{text}</Text>
    </View>
  );
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [boostCount, setBoostCount] = useState(0);
  const [subscribing, setSubscribing] = useState(false);
  const [currentOffering, setCurrentOffering] = useState<any>(null);

  useEffect(() => {
    fetchSubscriptionStatus();
    loadOfferings();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("users")
        .select("is_premium, boost_count")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setIsPremium(data?.is_premium || false);
      setBoostCount(data?.boost_count || 0);

      // Identify user in RevenueCat early
      await Purchases.logIn(user.id);

      // Check current entitlement status
      const purchaserInfo = await Purchases.getCustomerInfo();
      const hasPremium = purchaserInfo.entitlements.active['Ikhtari Pro'] !== undefined;

      if (hasPremium !== data?.is_premium) {
        // Sync with DB if there's a mismatch
        await supabase.from("users").update({ is_premium: hasPremium }).eq("id", user.id);
        setIsPremium(hasPremium);
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null) {
        setCurrentOffering(offerings.current);
      }
    } catch (e) {
      console.error("Error loading offerings:", e);
    }
  };

  const handleSubscribe = async () => {
    const pkg = currentOffering?.availablePackages?.[0];
    if (!pkg) {
      Alert.alert("Error", "No subscription packages available. Offering: " + (currentOffering?.identifier || "none"));
      return;
    }

    setSubscribing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "No authenticated user found.");
        return;
      }

      await Purchases.logIn(user.id);

      const { customerInfo } = await Purchases.purchasePackage(pkg);

      const activeEntitlementIds = Object.keys(customerInfo.entitlements.active);
      const hasPremium = customerInfo.entitlements.active['Ikhtari Pro'] !== undefined;

      if (hasPremium) {
        const { error } = await supabase
          .from("users")
          .update({
            is_premium: true,
            boost_count: 5
          })
          .eq("id", user.id);

        if (error) throw error;

        setIsPremium(true);
        setBoostCount(5);
        Alert.alert("Success!", "Welcome to Ikhtari Gold! Your premium features are now active.");
      } else {
        console.warn("Purchase completed but 'Ikhtari Pro' entitlement not found. Found:", activeEntitlementIds);
        Alert.alert(
          "Entitlement Mismatch",
          `Success, but we couldn't find the "Ikhtari Pro" entitlement. Found: ${activeEntitlementIds.join(", ") || "none"}.`
        );
      }
    } catch (error: any) {
      if (error.userCancelled) {
      } else {
        console.error("Purchase error detail:", error);
        Alert.alert("Purchase Failed", error.message || "An unknown error occurred during purchase.");
      }
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#FDFAF5] items-center justify-center">
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#F5F0E8] items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color="#1C1208" />
        </Pressable>
        <Text className="text-[#1C1208] text-xl font-bold ml-4">Subscription</Text>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* Current Status */}
        <View className="mt-6 p-6 rounded-3xl bg-white border border-[#EDE5D5] items-center">
          <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${isPremium ? 'bg-[#B8860B]/20' : 'bg-gray-500/20'}`}>
            <Ionicons name={isPremium ? "diamond" : "person-outline"} size={32} color={isPremium ? "#B8860B" : "#9CA3AF"} />
          </View>
          <Text className="text-[#1C1208] text-2xl font-bold mb-1">
            {isPremium ? "Premium Member" : "Free Member"}
          </Text>
          <Text className="text-gray-400 text-base">
            {boostCount} boosts remaining
          </Text>
        </View>

        {!isPremium && (
          <View className="mt-10">
            <Text className="text-[#B8860B] text-center text-sm font-bold tracking-widest uppercase mb-4">
              Unlock the full experience
            </Text>

            <View className="p-8 rounded-[40px] bg-[#B8860B]/10 border border-[#B8860B]/30 relative overflow-hidden">
              <View className="absolute -top-10 -right-10 w-40 h-40 bg-[#B8860B]/20 rounded-full blur-3xl" />

              <Text className="text-[#1C1208] text-3xl font-black mb-6">Ikhtari Gold</Text>

              <FeatureItem text="Unlimited Likes" />
              <FeatureItem text="5 Profile Boosts per month" />
              <FeatureItem text="See who liked you" />
              <FeatureItem text="Advanced filters" />

              <View className="mt-8">
                <Text className="text-[#9E8E7E] text-center text-sm mb-4">
                  {currentOffering?.availablePackages?.[0]?.product?.priceString ?
                    `Starting at ${currentOffering.availablePackages[0].product.priceString} / month` :
                    "Choose your plan"}
                </Text>
                <Pressable
                  onPress={handleSubscribe}
                  disabled={subscribing}
                  className="h-16 bg-[#B8860B] rounded-2xl items-center justify-center shadow-lg active:opacity-90"
                >
                  {subscribing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-lg font-black uppercase tracking-wider">Upgrade Now</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {isPremium && (
          <View className="mt-10 p-6 rounded-3xl bg-green-500/10 border border-green-500/20">
            <Text className="text-green-500 text-center font-bold text-lg mb-2">
              All set! Enjoy your benefits.
            </Text>
            <Text className="text-gray-400 text-center leading-5 uppercase text-xs tracking-widest">
              Manage your subscription in App Store / Google Play
            </Text>
          </View>
        )}

        <View className="mt-12 mb-8">
          <Text className="text-gray-500 text-center text-xs leading-5">
            By upgrading, you agree to our Terms of Service. Payments will be charged to your account and will automatically renew unless canceled 24 hours before the end of the current period.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
