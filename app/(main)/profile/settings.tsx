import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { supabase } from "../../../lib/supabase";
import { useCertification } from "../../../lib/hooks/useCertification";
import { useDiscoverStore } from "../../../lib/stores/discoverStore";

interface ChaperoneStatus {
  my_chaperone: {
    status: "pending" | "active" | "revoked";
    invite_email: string;
    chaperone_profile?: { first_name: string | null; last_name: string | null; name: string | null };
  } | null;
  wardships: { id: string; status: string }[];
}

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  danger?: boolean;
}

function SettingsItem({ icon, title, subtitle, onPress, showChevron = true, danger = false }: SettingsItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-4 px-4 bg-white rounded-2xl mb-3 border border-[#EDE5D5]"
    >
      <View className={`w-10 h-10 rounded-full items-center justify-center ${danger ? 'bg-red-500/20' : 'bg-[#B8860B]/20'}`}>
        <Ionicons name={icon} size={20} color={danger ? "#EF4444" : "#B8860B"} />
      </View>
      <View className="flex-1 ml-3">
        <Text className={`text-base font-medium ${danger ? 'text-red-500' : 'text-[#1C1208]'}`}>
          {title}
        </Text>
        {subtitle && (
          <Text className="text-[#9E8E7E] text-sm mt-0.5">{subtitle}</Text>
        )}
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [blurPhotos, setBlurPhotos] = useState(false);
  const [accountActive, setAccountActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [chaperoneStatus, setChaperoneStatus] = useState<ChaperoneStatus | null>(null);
  const { data: certification } = useCertification();

  useEffect(() => {
    fetchSettings();
    fetchChaperoneStatus();
  }, []);

  const fetchChaperoneStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase.functions.invoke("get-chaperone-status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (data && !data.error) {
        setChaperoneStatus(data);
      }
    } catch (error) {
      console.error("Error fetching chaperone status:", error);
    }
  };

  const getChaperoneSubtitle = (): string => {
    if (!chaperoneStatus) return "No Wali linked";
    const { my_chaperone, wardships } = chaperoneStatus;
    const activeWardships = wardships?.filter((w) => w.status === "active") || [];

    if (my_chaperone?.status === "active") {
      const profile = my_chaperone.chaperone_profile;
      const name = profile?.first_name
        ? `${profile.first_name}${profile.last_name ? " " + profile.last_name : ""}`
        : profile?.name || "Wali";
      const wardStr = activeWardships.length > 0
        ? ` · Wali for ${activeWardships.length}`
        : "";
      return `Active: ${name}${wardStr}`;
    } else if (my_chaperone?.status === "pending") {
      return "Pending invite";
    } else if (activeWardships.length > 0) {
      return `You are a Wali for ${activeWardships.length} ${activeWardships.length === 1 ? "person" : "people"}`;
    }
    return "No Wali linked";
  };

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("users")
        .select("blur_photos, account_active")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setBlurPhotos(data?.blur_photos || false);
      setAccountActive(data?.account_active ?? true);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlurPhotos = async () => {
    const newValue = !blurPhotos;
    setBlurPhotos(newValue); // Optimistic update

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("users")
        .update({ blur_photos: newValue })
        .eq("id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating blur setting:", error);
      setBlurPhotos(!newValue); // Rollback
      Alert.alert("Error", "Failed to update privacy setting.");
    }
  };

  const toggleAccountActive = async () => {
    const newValue = !accountActive;

    const title = newValue ? "Reactivate Account?" : "Take a break?";
    const message = newValue
      ? "Your profile will be visible to others again."
      : "Your profile will be hidden from everyone. You will be logged out and can reactivate anytime by logging back in.";

    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: newValue ? "Reactivate" : "Take a break",
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              const { error } = await supabase
                .from("users")
                .update({ account_active: newValue })
                .eq("id", user.id);

              if (error) throw error;

              if (!newValue) {
                // If taking a break, log out automatically without asking again
                await performLogout();
              } else {
                setAccountActive(newValue);
                Alert.alert("Success", "Account reactivated!");
              }
            } catch (error) {
              console.error("Error updating account status:", error);
              Alert.alert("Error", "Failed to update account status.");
            }
          }
        }
      ]
    );
  };

  const performLogout = async () => {
    setLoggingOut(true);
    try {
      useDiscoverStore.getState().resetFeed();
      await supabase.auth.signOut();
      router.replace("/");
    } catch (error) {
      console.error("Error logging out:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: performLogout,
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) throw new Error("No active session");

              const { data, error } = await supabase.functions.invoke('delete-account', {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              });

              if (error) throw error;
              if (data?.error) throw new Error(data.error);

              // Sign out locally
              useDiscoverStore.getState().resetFeed();
              await supabase.auth.signOut();

              Alert.alert(
                "Account Deleted",
                "Your account and all associated data have been permanently removed.",
                [{ text: "OK", onPress: () => router.replace("/") }] // Redirect to home screen
              );
            } catch (error: any) {
              console.error("Error deleting account:", error);
              Alert.alert("Error", error.message || "Failed to delete account. Please try again or contact support.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-[#FDFAF5]">
      {/* Header */}
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#F5F0E8] border border-[#EDE5D5] items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color="#1C1208" />
        </Pressable>
        <Text className="text-[#1C1208] text-xl font-bold ml-4">Settings</Text>
      </View>

      <ScrollView className="flex-1 px-6 pb-18" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Account Section */}
        <Text className="text-[#9E8E7E] text-sm font-medium mb-3 mt-4">ACCOUNT</Text>

        <SettingsItem
          icon="person-outline"
          title="Account Information"
          subtitle="Email, phone number"
          onPress={() => router.push("/(main)/profile/account-info")}
        />

        <SettingsItem
          icon="notifications-outline"
          title="Notifications"
          subtitle="Push notifications, email alerts"
          onPress={() => router.push("/(main)/profile/notifications")}
        />

        <SettingsItem
          icon="school-outline"
          title="Marriage Foundations Course"
          subtitle={certification?.is_certified ? "Certified" : `${certification?.completion_percentage || 0}% Complete`}
          onPress={() => router.push("/(main)/profile/marriage-foundations")}
        />

      

        <View className="flex-row items-center justify-between py-4 px-4 bg-white rounded-2xl mb-3 border border-[#EDE5D5]">
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 rounded-full items-center justify-center bg-[#B8860B]/20">
              <Ionicons name="eye-off-outline" size={20} color="#B8860B" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-medium text-[#1C1208]">Blur My Photos</Text>
              <Text className="text-[#9E8E7E] text-sm mt-0.5">Your photos will be visible only to people you like</Text>
            </View>
          </View>
          <Pressable
            onPress={toggleBlurPhotos}
            className={`w-12 h-6 rounded-full px-1 justify-center ${blurPhotos ? 'bg-[#B8860B]' : 'bg-gray-600'}`}
          >
            <View className={`w-4 h-4 rounded-full bg-white transition-all ${blurPhotos ? 'ml-6' : 'ml-0'}`} />
          </Pressable>
        </View>



        {/* Privacy Section */}
        <Text className="text-[#9E8E7E] text-sm font-medium mb-3 mt-6">PRIVACY</Text>

        <SettingsItem
          icon="shield-checkmark-outline"
          title="Wali / Chaperone"
          subtitle={getChaperoneSubtitle()}
          onPress={() => router.push("/(main)/profile/wali-setup")}
        />

        {/* Support Section */}
        <Text className="text-[#9E8E7E] text-sm font-medium mb-3 mt-6">SUPPORT</Text>

        <SettingsItem
          icon="help-circle-outline"
          title="Help & Support"
          subtitle="FAQ, contact us"
          onPress={async () => {
            const url = "https://ikhtari.com";
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
              await Linking.openURL(url);
            } else {
              Alert.alert("Error", "Unable to open website. Please visit https://ikhtari.com");
            }
          }}
        />

        <SettingsItem
          icon="document-text-outline"
          title="Terms of Service"
          onPress={async () => {
            const url = "https://ikhtari.com";
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
              await Linking.openURL(url);
            } else {
              Alert.alert("Error", "Unable to open Terms of Service. Please visit https://ikhtari.com");
            }
          }}
        />

        <SettingsItem
          icon="shield-outline"
          title="Privacy Policy"
          onPress={async () => {
            const url = "https://ikhtari.com";
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
              await Linking.openURL(url);
            } else {
              Alert.alert("Error", "Unable to open Privacy Policy. Please visit https://ikhtari.com");
            }
          }}
        />

        {/* Danger Zone */}
        <Text className="text-[#9E8E7E] text-sm font-medium mb-3 mt-6">DANGER ZONE</Text>

        <SettingsItem
          icon="log-out-outline"
          title="Log Out"
          onPress={handleLogout}
          showChevron={false}
          danger
        />

        <SettingsItem
          icon="pause-circle-outline"
          title={accountActive ? "Take a break ?" : "Reactivate Account"}
          subtitle={accountActive ? "Temporarily hide your profile" : "Make your profile visible again"}
          onPress={toggleAccountActive}
          showChevron={false}
        />

        <SettingsItem
          icon="trash-outline"
          title="Delete Account"
          subtitle="Permanently delete your account"
          onPress={handleDeleteAccount}
          showChevron={false}
          danger
        />

        {/* App Version */}
        <View className="items-center py-8">
          <Text className="text-[#BDB0A4] text-sm">Ikhtari v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {loggingOut && (
        <View className="absolute inset-0 bg-[#FDFAF5]/80 items-center justify-center">
          <ActivityIndicator size="large" color="#B8860B" />
          <Text className="text-[#1C1208] mt-4">Logging out...</Text>
        </View>
      )}
    </View>
  );
}

