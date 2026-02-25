import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

interface Message {
  id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  voice_url: string | null;
  created_at: string;
  read: boolean;
  reply_to: {
    id: string;
    sender_id: string;
    content: string | null;
    image_url: string | null;
  } | null;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - msgDate.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

export default function ChaperoneChatScreen() {
  const router = useRouter();
  const { wardId, matchId, wardName, otherName } = useLocalSearchParams<{
    wardId: string;
    matchId: string;
    wardName: string;
    otherName: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [wardProfile, setWardProfile] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const decodedWardName = wardName ? decodeURIComponent(wardName) : "Ward";
  const decodedOtherName = otherName ? decodeURIComponent(otherName) : "User";

  useEffect(() => {
    if (wardId && matchId) loadMessages();
  }, [wardId, matchId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("get-chaperone-messages", {
        body: { ward_id: wardId, match_id: matchId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setMessages(data?.messages || []);
      setWardProfile(data?.ward_profile || null);
      setOtherUser(data?.other_user || null);
    } catch (err: any) {
      console.error("Error loading chaperone messages:", err);
    } finally {
      setLoading(false);
    }
  };

  // Group messages by date
  const groupedItems = (() => {
    const items: any[] = [];
    let lastDateLabel = "";
    for (const msg of messages) {
      const label = formatDateLabel(msg.created_at);
      if (label !== lastDateLabel) {
        items.push({ type: "date_label", label, key: `date-${msg.created_at}` });
        lastDateLabel = label;
      }
      items.push({ type: "message", ...msg, key: msg.id });
    }
    return items;
  })();

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === "date_label") {
      return (
        <View className="items-center my-3">
          <View className="bg-[#F5F0E8] rounded-full px-4 py-1">
            <Text className="text-gray-400 text-xs">{item.label}</Text>
          </View>
        </View>
      );
    }

    const isWard = item.sender_id === wardId;
    const senderName = isWard ? decodedWardName : decodedOtherName;
    const senderPhoto = isWard ? wardProfile?.main_photo : otherUser?.main_photo;

    return (
      <View
        className={`flex-row items-end px-3 mb-2 ${isWard ? "justify-end" : "justify-start"}`}
      >
        {!isWard && (
          <View className="mr-2 mb-1">
            {senderPhoto ? (
              <Image
                source={{ uri: senderPhoto }}
                className="w-7 h-7 rounded-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-7 h-7 rounded-full bg-[#F5F0E8] items-center justify-center">
                <Text className="text-[#6B5D4F] text-xs">👤</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ maxWidth: "70%" }}>
          {/* Sender name label */}
          <Text
            className={`text-xs text-gray-500 mb-1 ${isWard ? "text-right" : "text-left"}`}
          >
            {senderName}
          </Text>

          {/* Reply preview */}
          {item.reply_to && (
            <View
              className={`rounded-xl px-3 py-2 mb-1 border-l-2 border-[#B8860B] ${
                isWard ? "bg-[#2A2000]" : "bg-[#F5F0E8]"
              }`}
            >
              <Text className="text-gray-400 text-xs" numberOfLines={2}>
                {item.reply_to.image_url ? "Image" : item.reply_to.content || ""}
              </Text>
            </View>
          )}

          {/* Message bubble */}
          <View
            className={`rounded-2xl px-4 py-2.5 ${
              isWard ? "bg-[#B8860B] rounded-br-sm" : "bg-[#F5F0E8] rounded-bl-sm"
            }`}
          >
            {item.image_url && (
              <Image
                source={{ uri: item.image_url }}
                className="w-48 h-48 rounded-xl"
                resizeMode="cover"
              />
            )}
            {item.content && (
              <Text className={`text-sm leading-5 ${isWard ? "text-white" : "text-[#1C1208]"}`}>
                {item.content}
              </Text>
            )}
            {item.voice_url && (
              <View className="flex-row items-center gap-2 py-1">
                <Ionicons name="mic" size={16} color={isWard ? "#fff" : "#6B5D4F"} />
                <Text className={`text-xs ${isWard ? "text-white/80" : "text-[#6B5D4F]"}`}>
                  Voice message
                </Text>
              </View>
            )}
          </View>

          <Text
            className={`text-gray-600 text-xs mt-1 ${isWard ? "text-right" : "text-left"}`}
          >
            {formatTime(item.created_at)}
          </Text>
        </View>

        {isWard && (
          <View className="ml-2 mb-1">
            {senderPhoto ? (
              <Image
                source={{ uri: senderPhoto }}
                className="w-7 h-7 rounded-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-7 h-7 rounded-full bg-[#F5F0E8] items-center justify-center">
                <Text className="text-[#6B5D4F] text-xs">👤</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#FDFAF5]">
      {/* Header */}
      <View className="bg-[#FDFAF5] px-4 pt-14 pb-3 border-b border-[#EDE5D5]">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#F5F0E8] items-center justify-center mr-3"
          >
            <Ionicons name="arrow-back" size={22} color="#1C1208" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[#1C1208] text-base font-bold" numberOfLines={1}>
              {decodedWardName} ↔ {decodedOtherName}
            </Text>
            <Text className="text-[#B8860B] text-xs">Wali View</Text>
          </View>
          <View className="flex-row items-center gap-1.5 bg-[#B8860B]/20 rounded-full px-3 py-1.5">
            <Ionicons name="shield-checkmark" size={13} color="#B8860B" />
            <Text className="text-[#B8860B] text-xs font-medium">Wali</Text>
          </View>
        </View>
      </View>

      {/* Wali read-only banner */}
      <View className="bg-[#B8860B]/15 px-4 py-2.5 flex-row items-center gap-2 border-b border-[#B8860B]/20">
        <Ionicons name="eye-outline" size={14} color="#B8860B" />
        <Text className="text-[#B8860B] text-xs flex-1">
          You are viewing this chat as a Wali. You cannot send messages.
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#B8860B" />
        </View>
      ) : messages.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="chatbubble-outline" size={56} color="#374151" />
          <Text className="text-gray-400 text-lg font-medium mt-4 text-center">
            No messages yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
