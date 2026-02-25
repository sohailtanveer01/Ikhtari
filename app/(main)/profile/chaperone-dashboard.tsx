import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

interface ChatItem {
  match_id: string;
  other_user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    name: string | null;
    main_photo: string | null;
  } | null;
  last_message: {
    content: string | null;
    image_url: string | null;
    created_at: string;
    sender_id: string;
  } | null;
  created_at: string;
}

function getDisplayName(user: any): string {
  if (!user) return "Unknown";
  if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
  if (user.first_name) return user.first_name;
  return user.name || "Unknown";
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChaperoneDashboardScreen() {
  const router = useRouter();
  const { wardId, wardName } = useLocalSearchParams<{ wardId: string; wardName: string }>();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wardId) loadChats();
  }, [wardId]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("get-chaperone-chats", {
        body: { ward_id: wardId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      setChats(data?.chats || []);
    } catch (err: any) {
      console.error("Error loading chaperone chats:", err);
    } finally {
      setLoading(false);
    }
  };

  const decodedWardName = wardName ? decodeURIComponent(wardName) : "Ward";

  return (
    <View className="flex-1 bg-[#FDFAF5]">
      {/* Header */}
      <View className="bg-[#FDFAF5] px-4 pt-14 pb-4 border-b border-[#EDE5D5]">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#F5F0E8] items-center justify-center mr-3"
          >
            <Ionicons name="arrow-back" size={22} color="#1C1208" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[#1C1208] text-base font-bold">Wali View</Text>
            <Text className="text-[#B8860B] text-sm">{decodedWardName}'s Chats</Text>
          </View>
          <View className="flex-row items-center gap-1.5 bg-[#B8860B]/20 rounded-full px-3 py-1.5">
            <Ionicons name="shield-checkmark" size={13} color="#B8860B" />
            <Text className="text-[#B8860B] text-xs font-medium">Read Only</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#B8860B" />
        </View>
      ) : chats.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="chatbubbles-outline" size={56} color="#374151" />
          <Text className="text-gray-400 text-lg font-medium mt-4 text-center">
            No conversations yet
          </Text>
          <Text className="text-gray-600 text-sm text-center mt-2">
            {decodedWardName} hasn't started any conversations.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {chats.map((chat) => {
            const otherName = getDisplayName(chat.other_user);
            const lastMsg = chat.last_message;
            const lastMsgText = lastMsg
              ? lastMsg.image_url
                ? "Sent an image"
                : lastMsg.content || ""
              : "No messages yet";
            const timeStr = lastMsg ? formatTime(lastMsg.created_at) : "";

            return (
              <Pressable
                key={chat.match_id}
                onPress={() =>
                  router.push(
                    `/(main)/profile/chaperone-chat?wardId=${wardId}&matchId=${chat.match_id}&wardName=${encodeURIComponent(decodedWardName)}&otherName=${encodeURIComponent(otherName)}`
                  )
                }
                className="flex-row items-center px-4 py-4 border-b border-[#EDE5D5] active:bg-[#F5F0E8]"
              >
                {chat.other_user?.main_photo ? (
                  <Image
                    source={{ uri: chat.other_user.main_photo }}
                    className="w-14 h-14 rounded-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-14 h-14 rounded-full bg-[#F5F0E8] items-center justify-center">
                    <Text className="text-[#9E8E7E] text-xl">👤</Text>
                  </View>
                )}

                <View className="flex-1 ml-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[#1C1208] text-base font-semibold" numberOfLines={1}>
                      {otherName}
                    </Text>
                    {timeStr ? (
                      <Text className="text-gray-500 text-xs">{timeStr}</Text>
                    ) : null}
                  </View>
                  <Text className="text-gray-400 text-sm mt-0.5" numberOfLines={1}>
                    {lastMsgText}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#4B5563" className="ml-2" />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
