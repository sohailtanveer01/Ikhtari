import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

interface ChaperoneLink {
  id: string;
  user_id: string;
  chaperone_id: string | null;
  invite_email: string;
  status: "pending" | "active" | "revoked";
  created_at: string;
  accepted_at: string | null;
  chaperone_profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    name: string | null;
    main_photo: string | null;
  };
  ward_profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    name: string | null;
    main_photo: string | null;
  };
}

function getDisplayName(profile: any): string {
  if (!profile) return "Unknown";
  if (profile.first_name && profile.last_name) return `${profile.first_name} ${profile.last_name}`;
  if (profile.first_name) return profile.first_name;
  return profile.name || "Unknown";
}

export default function WaliSetupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [myChaperone, setMyChaperone] = useState<ChaperoneLink | null>(null);
  const [wardships, setWardships] = useState<ChaperoneLink[]>([]);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("get-chaperone-status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setMyChaperone(data?.my_chaperone || null);
      setWardships(data?.wardships || []);
    } catch (error: any) {
      console.error("Error loading chaperone status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert("Error", "Please enter an email address.");
      return;
    }

    setInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("invite-chaperone", {
        body: { email: inviteEmail.trim().toLowerCase() },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const msg = data?.has_account
        ? "Your Wali has been notified. They can accept in their Settings."
        : "Invite saved. They'll be linked automatically when they sign up with that email.";

      Alert.alert("Invite Sent", msg);
      setInviteEmail("");
      await loadStatus();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send invite.");
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = () => {
    if (!myChaperone) return;
    Alert.alert(
      "Remove Wali",
      "Are you sure you want to remove your Wali? They will lose access to your conversations.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;

              const { data, error } = await supabase.functions.invoke("revoke-chaperone", {
                body: { link_id: myChaperone.id },
                headers: { Authorization: `Bearer ${session.access_token}` },
              });

              if (error) throw error;
              if (data?.error) throw new Error(data.error);

              setMyChaperone(null);
              Alert.alert("Removed", "Your Wali has been removed.");
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to remove Wali.");
            }
          },
        },
      ]
    );
  };

  const handleAcceptWardship = async (link: ChaperoneLink) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("accept-chaperone-invite", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      Alert.alert("Accepted", "You are now a Wali for this person.");
      await loadStatus();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to accept.");
    }
  };

  const handleDeclineWardship = (link: ChaperoneLink) => {
    Alert.alert(
      "Decline",
      "Are you sure you want to decline this Wali request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;

              // Revoke from chaperone side: call revoke-chaperone with service role via ward_id
              // Since chaperone can't directly update (only ward can revoke), we repurpose the link
              // by calling accept which sets status to active, then the ward must revoke.
              // Instead: we use a service approach — just remove wardship from wardships list locally
              // and alert user to ask the ward to revoke. In production, add a decline edge function.
              Alert.alert(
                "Note",
                "To remove this wardship, ask the person to remove you from their Wali settings, or contact support.",
                [{ text: "OK" }]
              );
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed.");
            }
          },
        },
      ]
    );
  };

  const renderMyWaliSection = () => {
    let statusText = "No Wali linked";
    let statusColor = "#9CA3AF";

    if (myChaperone) {
      if (myChaperone.status === "pending") {
        statusText = `Pending — ${myChaperone.invite_email}`;
        statusColor = "#F59E0B";
      } else if (myChaperone.status === "active") {
        const name = getDisplayName(myChaperone.chaperone_profile);
        statusText = `Active: ${name}`;
        statusColor = "#10B981";
      }
    }

    return (
      <View className="mb-6">
        <Text className="text-gray-400 text-sm font-medium mb-3">MY WALI</Text>

        {/* Current status */}
        <View className="bg-white rounded-2xl p-4 mb-3 border border-[#EDE5D5]">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="shield-checkmark" size={18} color={statusColor} />
            <Text style={{ color: statusColor }} className="text-sm font-medium">{statusText}</Text>
          </View>

          {myChaperone?.status === "active" && myChaperone.chaperone_profile?.main_photo && (
            <View className="flex-row items-center gap-3 mt-2">
              <Image
                source={{ uri: myChaperone.chaperone_profile.main_photo }}
                className="w-10 h-10 rounded-full"
                resizeMode="cover"
              />
              <Text className="text-[#1C1208] text-sm">{getDisplayName(myChaperone.chaperone_profile)}</Text>
            </View>
          )}

          {myChaperone && (myChaperone.status === "pending" || myChaperone.status === "active") && (
            <Pressable
              onPress={handleRevoke}
              className="mt-3 bg-red-500/20 rounded-xl py-2 px-4 self-start"
            >
              <Text className="text-red-400 text-sm font-medium">Remove Wali</Text>
            </Pressable>
          )}
        </View>

        {/* Invite form — only show if no active/pending invite */}
        {!myChaperone && (
          <View className="bg-white rounded-2xl p-4 border border-[#EDE5D5]">
            <Text className="text-[#1C1208] text-sm mb-3">
              Invite a Wali by email. They'll have read-only access to your conversations.
            </Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                className="flex-1 bg-white rounded-xl px-4 py-3 text-[#1C1208] text-sm border border-[#EDE5D5]"
                placeholder="Enter email address"
                placeholderTextColor="#6B7280"
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={handleInvite}
                disabled={inviting}
                className="bg-[#B8860B] rounded-xl px-4 py-3"
              >
                {inviting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text className="text-white text-sm font-semibold">Send</Text>
                }
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderWardshipsSection = () => {
    if (wardships.length === 0) return null;

    return (
      <View className="mb-6">
        <Text className="text-gray-400 text-sm font-medium mb-3">I AM A WALI FOR</Text>

        {wardships.map((link) => {
          const wardName = getDisplayName(link.ward_profile);
          const isPending = link.status === "pending";
          const isActive = link.status === "active";

          return (
            <View key={link.id} className="bg-white rounded-2xl p-4 mb-3 border border-[#EDE5D5]">
              <View className="flex-row items-center gap-3">
                {link.ward_profile?.main_photo ? (
                  <Image
                    source={{ uri: link.ward_profile.main_photo }}
                    className="w-10 h-10 rounded-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full bg-[#F5F0E8] items-center justify-center">
                    <Text className="text-[#1C1208]">👤</Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-[#1C1208] text-sm font-medium">{wardName}</Text>
                  <Text className="text-gray-400 text-xs">{link.invite_email}</Text>
                </View>
                {isPending && (
                  <View className="bg-amber-500/20 rounded-full px-2 py-1">
                    <Text className="text-amber-400 text-xs">Pending</Text>
                  </View>
                )}
                {isActive && (
                  <View className="bg-green-500/20 rounded-full px-2 py-1">
                    <Text className="text-green-400 text-xs">Active</Text>
                  </View>
                )}
              </View>

              {isPending && (
                <View className="flex-row gap-2 mt-3">
                  <Pressable
                    onPress={() => handleAcceptWardship(link)}
                    className="flex-1 bg-[#B8860B] rounded-xl py-2 items-center"
                  >
                    <Text className="text-white text-sm font-semibold">Accept</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeclineWardship(link)}
                    className="flex-1 bg-[#F5F0E8] rounded-xl py-2 items-center"
                  >
                    <Text className="text-gray-300 text-sm">Decline</Text>
                  </Pressable>
                </View>
              )}

              {isActive && (
                <Pressable
                  onPress={() =>
                    router.push(
                      `/(main)/profile/chaperone-dashboard?wardId=${link.user_id}&wardName=${encodeURIComponent(wardName)}`
                    )
                  }
                  className="mt-3 bg-[#B8860B]/20 rounded-xl py-2 px-4 flex-row items-center justify-center gap-2"
                >
                  <Ionicons name="eye-outline" size={16} color="#B8860B" />
                  <Text className="text-[#B8860B] text-sm font-medium">View Chats</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#FDFAF5]">
      {/* Header */}
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#F5F0E8] items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color="#1C1208" />
        </Pressable>
        <View className="ml-4">
          <Text className="text-[#1C1208] text-xl font-bold">Wali / Chaperone</Text>
          <Text className="text-gray-400 text-xs mt-0.5">Islamic accountability feature</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#B8860B" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 48, paddingTop: 8 }}
        >
          {/* Info banner */}
          <View className="bg-[#B8860B]/10 border border-[#B8860B]/30 rounded-2xl p-4 mb-6 flex-row items-start gap-3">
            <Ionicons name="shield-checkmark" size={20} color="#B8860B" className="mt-0.5" />
            <Text className="text-[#B8860B]/90 text-sm flex-1 leading-5">
              A Wali (guardian) can view all your conversations in read-only mode. Both sides of every chat will see a "Wali is present" badge. This adds transparency aligned with Islamic courtship values.
            </Text>
          </View>

          {renderMyWaliSection()}
          {renderWardshipsSection()}
        </ScrollView>
      )}
    </View>
  );
}
