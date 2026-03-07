import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "../../../lib/supabase";
import { isUserActive } from "../../../lib/useActiveStatus";
import { MarriageFoundationsBadge } from "../../../components/MarriageFoundationsBadge";
import { useCertification } from "../../../lib/hooks/useCertification";

// Clean photo URLs
function cleanPhotoUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  if (url.includes("localhost")) {
    const supabasePart = url.split(":http://localhost")[0];
    if (supabasePart && supabasePart.startsWith("http")) return supabasePart;
    return null;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return null;
}

// Message Item Component with drag-to-reply
function MessageItem({
  item,
  isMe,
  mainPhoto,
  otherUser,
  currentUser,
  onReply,
  onImagePress,
  onToggleVoice,
  onScrollToMessage,
  isVoicePlaying,
  voiceProgress,
  voiceDurationLabel,
  onLongPress,
  showDeleteLabel,
  onDeletePress,
  onTap,
}: {
  item: any;
  isMe: boolean;
  mainPhoto: string | null;
  otherUser: any;
  currentUser: any;
  onReply: (message: any) => void;
  onImagePress: (imageUrl: string) => void;
  onToggleVoice: (message: any) => void;
  onScrollToMessage: (messageId: string) => void;
  isVoicePlaying: boolean;
  voiceProgress: number; // 0..1
  voiceDurationLabel: string;
  onLongPress?: (message: any) => void;
  showDeleteLabel?: boolean;
  onDeletePress?: () => void;
  onTap?: () => void;
}) {
  // Get screen width for drag limit
  const screenWidth = Dimensions.get("window").width;
  const maxDragDistance = screenWidth / 3; // 1/3 of screen width
  const replyThreshold = screenWidth / 4; // Trigger reply at 1/4 of screen

  // Drag gesture to reply
  const translateX = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((e) => {
      // Only allow dragging left (for right-aligned messages) or right (for left-aligned messages)
      if (isMe) {
        // For sent messages, drag left to reply
        if (e.translationX < 0) {
          // Limit drag to maxDragDistance (1/3 of screen)
          translateX.value = Math.max(e.translationX, -maxDragDistance);
        }
      } else {
        // For received messages, drag right to reply
        if (e.translationX > 0) {
          // Limit drag to maxDragDistance (1/3 of screen)
          translateX.value = Math.min(e.translationX, maxDragDistance);
        }
      }
    })
    .onEnd((e) => {
      const shouldReply = isMe
        ? e.translationX < -replyThreshold
        : e.translationX > replyThreshold;

      if (shouldReply) {
        runOnJS(onReply)(item);
      }

      // Reset position
      translateX.value = withSpring(0);
      isDragging.value = false;
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: isDragging.value ? 0.8 : 1,
    };
  });

  const showProfilePic = !isMe && mainPhoto;
  const isDeleted = item.media_type === "deleted";

  return (
    <View
      className={`mb-2 flex-row ${isMe ? "justify-end" : "justify-start"
        } items-end`}
    >
      {!isMe && (
        <View className="mr-2 mb-1">
          {showProfilePic ? (
            <Image
              source={{ uri: mainPhoto! }}
              className="w-8 h-8 rounded-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-8 h-8 rounded-full bg-[#F5F0E8] items-center justify-center">
              <Text className="text-[#9E8E7E] text-xs">👤</Text>
            </View>
          )}
        </View>
      )}

      <View className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
        {/* Show replied-to message preview */}
        {item.reply_to && (
          <View
            className={`mb-1 px-3 py-1.5 rounded-lg border-l-2 ${isMe
              ? "bg-[#FDF3DC] border-[#B8860B]"
              : "bg-[#F5F0E8] border-[#EDE5D5]"
              }`}
          >
            <Text className="text-[#9E8E7E] text-xs mb-0.5">
              {item.reply_to.sender_id === currentUser?.id
                ? "You"
                : otherUser?.first_name || "User"}
            </Text>
            {item.reply_to.image_url ? (
              <View className="flex-row items-center">
                <Image
                  source={{
                    uri:
                      cleanPhotoUrl(item.reply_to.image_url) ||
                      item.reply_to.image_url,
                  }}
                  className="w-20 h-20 rounded-md mr-2"
                  resizeMode="cover"
                />
              </View>
            ) : item.reply_to.voice_url ? (
              <Pressable
                onPress={() => onScrollToMessage(item.reply_to.id)}
                className="flex-row items-center"
              >
                <View className="w-8 h-8 rounded-full bg-[#EDE5D5] items-center justify-center mr-2">
                  <Ionicons name="mic" size={14} color="#9E8E7E" />
                </View>
                <Text className="text-[#9E8E7E] text-xs italic">Voice note</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => onScrollToMessage(item.reply_to.id)}>
                <Text className="text-[#9E8E7E] text-xs" numberOfLines={1}>
                  {item.reply_to.content || "Message"}
                </Text>
              </Pressable>
            )}
          </View>
        )}
        <Pressable
          onLongPress={() => {
            if (onLongPress) onLongPress(item);
          }}
          onPress={() => {
            if (onTap) onTap();
          }}
        >
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={animatedStyle}
              className={`rounded-2xl ${isMe
                ? "bg-[#B8860B] rounded-br-sm"
                : "bg-[#F5F0E8] rounded-bl-sm"
                }`}
            >
              {item.image_url && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    const imageUrl =
                      cleanPhotoUrl(item.image_url) || item.image_url;
                    onImagePress(imageUrl);
                  }}
                >
                  <ExpoImage
                    source={{
                      uri: cleanPhotoUrl(item.image_url) || item.image_url,
                    }}
                    style={{
                      width: 250,
                      height: 250,
                      borderTopLeftRadius: 16,
                      borderTopRightRadius: 16,
                      borderBottomLeftRadius:
                        item.content && item.content.trim() ? 0 : 16,
                      borderBottomRightRadius:
                        item.content && item.content.trim() ? 0 : 16,
                    }}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                    onError={(error) => {
                      console.error("❌ Image load error:", error);
                      console.error("❌ Image URL:", item.image_url);
                    }}
                    onLoad={() => {
                    }}
                  />
                </Pressable>
              )}

              {item.voice_url && (
                <View className="px-4 py-3">
                  <View className="flex-row items-center">
                    <Pressable
                      onPress={() => onToggleVoice(item)}
                      className={`w-10 h-10 rounded-full items-center justify-center border ${isMe ? "bg-[#B8860B] border-transparent" : "bg-[#F5F0E8] border-[#EDE5D5]"
                        }`}
                    >
                      <Ionicons
                        name={isVoicePlaying ? "pause" : "play"}
                        size={18}
                        color={isMe ? "#000000" : "#6B5D4F"}
                      />
                    </Pressable>

                    <View className="flex-1 ml-3">
                      <View className={`h-1.5 rounded-full overflow-hidden ${isMe ? "bg-white/20" : "bg-[#EDE5D5]"}`}>
                        <View
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, voiceProgress * 100)
                            )}%`,
                            height: "100%",
                            backgroundColor: "#B8860B",
                          }}
                        />
                      </View>
                      <Text className={`text-xs mt-1 ${isMe ? "text-white/60" : "text-[#9E8E7E]"}`}>
                        {voiceDurationLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {item.content && item.content.trim() && (
                <Text
                  className={`text-base px-4 py-2.5 ${isDeleted ? (isMe ? "text-white/50" : "text-[#9E8E7E]") + " italic" : isMe ? "text-white" : "text-[#1C1208]"}`}
                >
                  {item.content}
                </Text>
              )}
            </Animated.View>
          </GestureDetector>
        </Pressable>

        {showDeleteLabel && !isDeleted && (
          <Pressable
            onPress={onDeletePress}
            className={`mt-1 ${isMe ? "self-end" : "self-start"
              } bg-red-500/15 border border-red-400/60 px-3 py-1.5 rounded-full`}
          >
            <Text className="text-xs font-semibold text-red-400">Delete this message ?</Text>
          </Pressable>
        )}

        {/* Read receipt checkmarks (only for sent messages) */}
        {isMe && (
          <View className="flex-row items-center mt-1 mr-1">
            <Ionicons
              name={item.read ? "checkmark-done" : "checkmark"}
              size={14}
              color={item.read ? "#B8860B" : "#FFFFFF"}
              style={{ opacity: item.read ? 1 : 0.6 }}
            />
          </View>
        )}
      </View>
    </View>
  );
}

// Upload image to Supabase Storage
async function uploadChatMedia(
  uri: string,
  matchId: string,
  userId: string
): Promise<string> {
  const ext = uri.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const filePath = `${matchId}/${userId}/${timestamp}.${ext}`;

  const response = await fetch(uri);
  const blob = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from("chat-media")
    .upload(filePath, blob, {
      contentType: `image/${ext}`,
      upsert: false,
    });

  if (error) throw error;

  // Try public URL first, fallback to signed URL if needed
  const { data: publicData } = supabase.storage
    .from("chat-media")
    .getPublicUrl(filePath);

  // Return public URL (bucket should be public)
  return publicData.publicUrl;
}

// Upload voice note (m4a) to Supabase Storage
async function uploadChatVoice(
  uri: string,
  matchId: string,
  userId: string
): Promise<string> {
  const timestamp = Date.now();
  const filePath = `${matchId}/${userId}/${timestamp}.m4a`;

  const response = await fetch(uri);
  const blob = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from("chat-media")
    .upload(filePath, blob, {
      contentType: "audio/m4a",
      upsert: false,
    });

  if (error) throw error;

  const { data: publicData } = supabase.storage
    .from("chat-media")
    .getPublicUrl(filePath);

  return publicData.publicUrl;
}

// Get signed URL for chat media (fallback if bucket is not public)
async function getChatMediaUrl(mediaUrl: string): Promise<string> {
  // If it's already a full URL, return it
  if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
    // Extract file path from public URL
    const urlParts = mediaUrl.split("/storage/v1/object/public/chat-media/");
    if (urlParts.length === 2) {
      const filePath = urlParts[1];

      // Try to get a signed URL (valid for 1 hour)
      const { data: signedData, error } = await supabase.storage
        .from("chat-media")
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (!error && signedData?.signedUrl) {
        return signedData.signedUrl;
      }
    }
  }

  // Fallback to original URL
  return mediaUrl;
}

export default function ChatScreen() {
  // Prevent screenshots to keep chats safe
  // ScreenCapture.usePreventScreenCapture();

  const { chatId } = useLocalSearchParams();
  const router = useRouter();
  const [text, setText] = useState("");
  const [halalWarning, setHalalWarning] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [pendingVoice, setPendingVoice] = useState<{
    uri: string;
    durationMs: number;
  } | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null); // Message being replied to
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // Intent questions gate state
  const [gateLoading, setGateLoading] = useState(true);
  const [gateRequired, setGateRequired] = useState(false);
  const [gateQuestions, setGateQuestions] = useState<any[]>([]);
  const [gateOtherName, setGateOtherName] = useState("");
  const [gateAnswers, setGateAnswers] = useState<Record<string, string>>({});
  const [gateSubmitting, setGateSubmitting] = useState(false);
  // Waiting state — acceptor waits for sender to answer questions
  const [waitingForOther, setWaitingForOther] = useState(false);
  const [waitingOtherName, setWaitingOtherName] = useState("");
  const [waitingInitiatedById, setWaitingInitiatedById] = useState<string | null>(null);
  const [waitingQuestions, setWaitingQuestions] = useState<any[]>([]);
  // Awaiting approval state — initiator submitted answers, waiting for acceptor to approve
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [awaitingOtherName, setAwaitingOtherName] = useState("");
  // Review state — acceptor sees initiator's answers and can approve
  const [reviewRequired, setReviewRequired] = useState(false);
  const [reviewAnswers, setReviewAnswers] = useState<any[]>([]);
  const [reviewOtherName, setReviewOtherName] = useState("");
  const [reviewApproving, setReviewApproving] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSentTypingStartedRef = useRef<boolean>(false);
  const typingIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  // Voice recording refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordStartRef = useRef<number>(0);
  const micPulse = useSharedValue(1);

  // Voice playback (only one at a time)
  const playingSoundRef = useRef<Audio.Sound | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<
    Record<string, { pos: number; dur: number }>
  >({});

  // Track whether we should mark messages as read on next fetch
  const shouldMarkAsReadRef = useRef(true);

  // Fetch chat data with React Query (cached)
  // Always refetch on mount to ensure messages are marked as read
  const {
    data: chatData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Only mark as read if the ref says so (true on focus, false on real-time updates)
      const markAsRead = shouldMarkAsReadRef.current;
      shouldMarkAsReadRef.current = false; // Reset after use - next refetch won't mark as read

      const { data, error } = await supabase.functions.invoke("get-chat", {
        body: { matchId: chatId, markAsRead },
      });

      if (error) throw error;

      // TRUST the database values - don't do any optimistic updates
      // The Edge Function now fetches messages AFTER marking as read
      return data;
    },
    staleTime: 0, // Always consider stale - we need to mark messages as read on every open
    gcTime: 1000 * 60 * 5, // 5 minutes - shorter cache time to reduce stale data
    refetchOnMount: true, // Always refetch when opening chat to mark messages as read
    refetchOnWindowFocus: false,
  });

  const otherUser = chatData?.otherUser || null;
  const { data: otherUserCertification } = useCertification(otherUser?.id);
  
  // Get current user ID directly from auth to ensure accuracy
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  useEffect(() => {
    // Always get the current user ID from auth to ensure it's correct
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (user && !error) {
        setCurrentUserId(user.id);
      } else if (chatData?.currentUserId) {
        // Fallback to chatData if auth fails
        setCurrentUserId(chatData.currentUserId);
      }
    });
  }, [chatData?.currentUserId]);
  
  const currentUser = currentUserId ? { id: currentUserId } : null;
  const messages = chatData?.messages || [];
  const isBlocked = chatData?.isBlocked || false;
  const iAmBlocked = chatData?.iAmBlocked || false;
  const isUnmatched = chatData?.isUnmatched || false;
  const rematchRequest = chatData?.rematchRequest || null;
  const hasChaperone = chatData?.has_chaperone || false;
  const isCompliment = chatData?.isCompliment || false;
  const complimentId = chatData?.complimentId || null;
  const complimentStatus = chatData?.complimentStatus || null;
  const isComplimentSender = chatData?.isComplimentSender || false;
  const isComplimentRecipient = chatData?.isComplimentRecipient || false;
  const interestQA = chatData?.interestQA || null;
  const gateQA = chatData?.gateQA || null;

  // Check intent questions gate on mount
  useEffect(() => {
    if (!chatId) return;
    setGateLoading(true);
    supabase.functions
      .invoke("get-chat-gate", { body: { matchId: chatId } })
      .then(({ data, error }) => {
        if (!error && data) {
          if (data.gateRequired) {
            setGateRequired(true);
            setGateQuestions(data.questions || []);
            setGateOtherName(data.otherUserName || "them");
          } else if (data.awaitingApproval) {
            setAwaitingApproval(true);
            setAwaitingOtherName(data.otherUserName || "them");
          } else if (data.reviewRequired) {
            setReviewRequired(true);
            setReviewAnswers(data.answers || []);
            setReviewOtherName(data.otherUserName || "them");
          } else if (data.waitingForOther) {
            setWaitingForOther(true);
            setWaitingOtherName(data.otherUserName || "them");
            setWaitingInitiatedById(data.initiatedById || null);
            setWaitingQuestions(data.myQuestions || []);
          } else {
            setGateRequired(false);
            setWaitingForOther(false);
            setAwaitingApproval(false);
            setReviewRequired(false);
          }
        }
        setGateLoading(false);
      })
      .catch(() => setGateLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // Realtime subscription: when the initiator submits answers, auto-unlock waiting state
  useEffect(() => {
    if (!waitingForOther || !chatId || !waitingInitiatedById) return;

    const channel = supabase
      .channel(`gate-answers-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_intent_answers",
          filter: `match_id=eq.${chatId}`,
        },
        () => {
          // Re-check the gate when a new answer is inserted
          supabase.functions
            .invoke("get-chat-gate", { body: { matchId: chatId } })
            .then(({ data, error }) => {
              if (!error && data) {
                if (data.reviewRequired) {
                  setWaitingForOther(false);
                  setReviewRequired(true);
                  setReviewAnswers(data.answers || []);
                  setReviewOtherName(data.otherUserName || "them");
                } else if (!data.waitingForOther) {
                  setWaitingForOther(false);
                }
              }
            })
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingForOther, chatId, waitingInitiatedById]);

  // Realtime subscription: when acceptor approves, unlock initiator's awaiting screen
  useEffect(() => {
    if (!awaitingApproval || !chatId) return;

    const channel = supabase
      .channel(`gate-approval-${chatId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${chatId}` },
        (payload: any) => {
          if (payload.new?.gate_approved_at) {
            setAwaitingApproval(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingApproval, chatId]);

  const approveGate = useCallback(async () => {
    setReviewApproving(true);
    try {
      const { error } = await supabase.functions.invoke("approve-chat-gate", {
        body: { matchId: chatId },
      });
      if (error) {
        Alert.alert("Error", "Failed to approve. Please try again.");
        return;
      }
      setReviewRequired(false);
    } catch {
      Alert.alert("Error", "Failed to approve. Please try again.");
    } finally {
      setReviewApproving(false);
    }
  }, [chatId]);

  const submitGateAnswers = useCallback(async () => {
    const answers = gateQuestions.map((q) => ({
      question_id: q.id,
      answer_text: gateAnswers[q.id] || "",
    }));
    const unanswered = answers.filter((a) => !a.answer_text.trim());
    if (unanswered.length > 0) {
      Alert.alert("Please answer all questions before continuing.");
      return;
    }
    setGateSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("submit-chat-gate-answers", {
        body: { matchId: chatId, answers },
      });
      if (error) {
        Alert.alert("Error", "Failed to submit answers. Please try again.");
        return;
      }
      setGateRequired(false);
      setAwaitingApproval(true);
      setAwaitingOtherName(gateOtherName);
    } catch {
      Alert.alert("Error", "Failed to submit answers. Please try again.");
    } finally {
      setGateSubmitting(false);
    }
  }, [chatId, gateAnswers, gateOtherName, gateQuestions]);

  // Q&A card collapse state — default expanded when no messages, collapsed when messages exist
  const [isQAExpanded, setIsQAExpanded] = useState<boolean | null>(null);
  const [gateQAVisible, setGateQAVisible] = useState(true);

  const DISMISSED_FILE = `${FileSystem.documentDirectory}dismissed_gate_qa.json`;

  const readDismissed = async (): Promise<string[]> => {
    try {
      const info = await FileSystem.getInfoAsync(DISMISSED_FILE);
      if (!info.exists) return [];
      const raw = await FileSystem.readAsStringAsync(DISMISSED_FILE);
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  };

  const dismissGateQA = async () => {
    if (!chatId) return;
    setGateQAVisible(false);
    try {
      const current = await readDismissed();
      if (!current.includes(chatId)) {
        await FileSystem.writeAsStringAsync(
          DISMISSED_FILE,
          JSON.stringify([...current, chatId])
        );
      }
    } catch {
      // silently ignore write errors
    }
  };

  // Load persisted dismissed state on mount
  useEffect(() => {
    if (!chatId) return;
    readDismissed().then((dismissed) => {
      if (dismissed.includes(chatId)) setGateQAVisible(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // Track OTHER USER's active status with real-time updates
  const [otherUserActive, setOtherUserActive] = useState<boolean>(false);

  // Check initial active status of OTHER USER
  useEffect(() => {
    if (otherUser?.last_active_at) {
      const active = isUserActive(otherUser.last_active_at);
      setOtherUserActive(active);
    } else {
      setOtherUserActive(false);
    }
  }, [otherUser?.last_active_at, otherUser?.id]);

  // Subscribe to OTHER USER's active status broadcasts (ephemeral events)
  useEffect(() => {
    if (!otherUser?.id) return;

    // Subscribe to the other user's active status channel
    const activeStatusChannel = supabase
      .channel(`active-status:${otherUser.id}`)
      .on("broadcast", { event: "active_status" }, (payload) => {
        // Only update if it's from the OTHER user
        if (payload.payload.userId === otherUser.id) {
          setOtherUserActive(payload.payload.isActive);
        }
      })
      .subscribe();

    // Also check initial status from database as fallback
    if (otherUser?.last_active_at) {
      const active = isUserActive(otherUser.last_active_at);
      setOtherUserActive(active);
    }

    return () => {
      supabase.removeChannel(activeStatusChannel);
    };
  }, [otherUser?.id]);

  // Debug: Log messages to see if media is present
  useEffect(() => {
    if (messages.length > 0) {
      const messagesWithMedia = messages.filter(
        (msg: any) => msg.image_url || msg.voice_url
      );
      if (messagesWithMedia.length > 0) {
      }
    }
  }, [messages]);

  // Mutation for sending messages with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      content,
      mediaUrl,
      mediaType,
      replyToId,
    }: {
      content?: string;
      mediaUrl?: string;
      mediaType?: string;
      replyToId?: string;
    }) => {
      // Build request body - only include fields that have values
      const requestBody: any = {
        matchId: chatId,
      };

      if (content && content.trim()) {
        requestBody.content = content.trim();
      }

      if (mediaUrl) {
        requestBody.mediaUrl = mediaUrl;
        requestBody.mediaType = mediaType || "image";
      }

      if (replyToId) {
        requestBody.replyToId = replyToId;
      }


      const { data, error } = await supabase.functions.invoke("send-message", {
        body: requestBody,
      });

      if (error) {
        console.error("❌ Send message error:", error);
        throw error;
      }


      // If strict halal filter blocked the message, return it (no optimistic clear)
      if (data?.blocked) {
        return data;
      }

      // Check if the response includes media
      if (data?.message) {
      }

      return data;
    },
    onSuccess: (data: any) => {
      if (data?.blocked) {
        setHalalWarning(
          data.warning ||
          "Please rephrase to keep the conversation halal and respectful."
        );
        return;
      }

      setHalalWarning(null);
      setText("");
      setSelectedImage(null);
      setReplyingTo(null);

      // SIMPLE STRATEGY: Always refetch to get complete data
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    },
  });

  // Track if screen is focused using a ref to avoid stale closures
  // Start as false - will be set to true when screen is focused
  const isScreenFocusedRef = useRef(false);

  // Mark messages as read when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      isScreenFocusedRef.current = true;
      // Set flag to mark messages as read on next fetch
      shouldMarkAsReadRef.current = true;
      // Refetch chat data to trigger marking messages as read
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      // Also invalidate chat list to update unread counts
      queryClient.invalidateQueries({ queryKey: ["chat-list"] });

      return () => {
        isScreenFocusedRef.current = false;
      };
    }, [chatId, queryClient])
  );

  // Real-time subscription for new messages
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase.channel(`messages:${chatId}`);

    // Store channel reference for broadcasting
    channelRef.current = channel;

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${chatId}`,
        },
        async (payload) => {
          const newMessage = payload.new;

          // Get current user ID
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          // For sender's own messages, skip - onSuccess will handle it
          if (newMessage.sender_id === user.id) {
            return;
          }

          // If screen is focused, mark messages as read (receiver is actively viewing)
          if (isScreenFocusedRef.current) {
            shouldMarkAsReadRef.current = true;
          } else {
          }

          // Refetch to get complete data with reply_to
          queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
          queryClient.invalidateQueries({ queryKey: ["chat-list"] });

          // Scroll to bottom after refetch
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 300);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${chatId}`,
        },
        async (payload) => {
          const wasMarkedAsRead =
            payload.new.read === true && payload.old?.read === false;

          if (wasMarkedAsRead) {
          }

          // SIMPLE STRATEGY: Always refetch to get updated data
          queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
          queryClient.invalidateQueries({ queryKey: ["chat-list"] });
        }
      )
      .on("broadcast", { event: "typing" }, async (payload) => {
        // Get current user ID
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Only show typing indicator if it's from the OTHER user (not current user)
        if (payload.payload.userId !== user.id) {
          if (payload.payload.type === "typing_started") {
            setIsOtherUserTyping(true);

            // Clear any existing timeout
            if (typingIndicatorTimeoutRef.current) {
              clearTimeout(typingIndicatorTimeoutRef.current);
            }

            // Auto-hide typing indicator after 3 seconds if no update
            typingIndicatorTimeoutRef.current = setTimeout(() => {
              setIsOtherUserTyping(false);
            }, 3000);
          } else if (payload.payload.type === "typing_stopped") {
            setIsOtherUserTyping(false);

            // Clear timeout
            if (typingIndicatorTimeoutRef.current) {
              clearTimeout(typingIndicatorTimeoutRef.current);
            }
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      // Clean up timeouts
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (typingIndicatorTimeoutRef.current) {
        clearTimeout(typingIndicatorTimeoutRef.current);
      }
    };
  }, [chatId, queryClient]);

  // Function to broadcast typing events
  const broadcastTyping = async (type: "typing_started" | "typing_stopped") => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !chatId || !channelRef.current) return;

      // Use the existing subscribed channel to send broadcast
      await channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: user.id,
          type: type,
        },
      });
    } catch (error) {
      console.error("Error broadcasting typing event:", error);
    }
  };

  // Handle text input changes and broadcast typing events
  const handleTextChange = (newText: string) => {
    setText(newText);
    if (halalWarning) setHalalWarning(null);

    // If user starts typing and we haven't sent typing_started yet
    if (newText.length > 0 && !hasSentTypingStartedRef.current) {
      hasSentTypingStartedRef.current = true;
      broadcastTyping("typing_started");
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // If text is empty, send typing_stopped immediately
    if (newText.length === 0) {
      if (hasSentTypingStartedRef.current) {
        hasSentTypingStartedRef.current = false;
        broadcastTyping("typing_stopped");
      }
      return;
    }

    // Set timeout to send typing_stopped after 1 second of no typing
    typingTimeoutRef.current = setTimeout(() => {
      if (hasSentTypingStartedRef.current) {
        hasSentTypingStartedRef.current = false;
        broadcastTyping("typing_stopped");
      }
    }, 1000); // 1 second debounce
  };

  // Clean up typing indicator when message is sent
  useEffect(() => {
    if (sendMessageMutation.isSuccess) {
      // Message was sent, stop typing indicator
      if (hasSentTypingStartedRef.current) {
        hasSentTypingStartedRef.current = false;
        broadcastTyping("typing_stopped");
      }
    }
  }, [sendMessageMutation.isSuccess]);

  const micPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: micPulse.value }],
    };
  });

  const ensureMicPermission = useCallback(async () => {
    try {
      const existing = await Audio.getPermissionsAsync();
      if (existing?.granted) return true;
      const requested = await Audio.requestPermissionsAsync();
      return !!requested?.granted;
    } catch (e) {
      console.error("Mic permission check error:", e);
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (
      isRecording ||
      pendingVoice ||
      selectedImage ||
      uploadingMedia ||
      sendMessageMutation.isPending
    )
      return;
    setHalalWarning(null);

    try {
      const granted = await ensureMicPermission();
      if (!granted) {
        Alert.alert(
          "Microphone Permission",
          "Please allow microphone access to send voice messages."
        );
        return;
      }

      // Stop any existing playback before recording
      if (playingSoundRef.current) {
        try {
          await playingSoundRef.current.stopAsync();
        } catch { }
        try {
          await playingSoundRef.current.unloadAsync();
        } catch { }
        playingSoundRef.current = null;
        setPlayingMessageId(null);
      }

      // iOS audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const recording = new Audio.Recording();
      recordingRef.current = recording;
      recordStartRef.current = Date.now();
      setRecordSeconds(0);
      setIsRecording(true);

      // Pulse animation while recording
      micPulse.value = withRepeat(
        withTiming(1.25, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );

      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();

      // Timer UI
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recordTimerRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - recordStartRef.current) / 1000
        );
        setRecordSeconds(elapsed);
      }, 250);
    } catch (e: any) {
      console.error("Start recording error:", e);
      Alert.alert("Error", "Could not start recording.");
      setIsRecording(false);
      micPulse.value = 1;
    }
  }, [
    isRecording,
    pendingVoice,
    selectedImage,
    uploadingMedia,
    sendMessageMutation.isPending,
    micPulse,
    ensureMicPermission,
  ]);

  const stopRecordingToPreview = useCallback(async () => {
    if (!isRecording) return;

    try {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }

      micPulse.value = 1;

      const recording = recordingRef.current;
      recordingRef.current = null;
      setIsRecording(false);

      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const durationMs = Date.now() - recordStartRef.current;

      // discard short recordings
      if (durationMs < 1000 || !uri) {
        setRecordSeconds(0);
        setPendingVoice(null);
        return;
      }

      setPendingVoice({ uri, durationMs });
      setRecordSeconds(0);
    } catch (e: any) {
      console.error("Stop/send recording error:", e);
      Alert.alert("Error", "Failed to stop recording.");
      micPulse.value = 1;
    }
  }, [isRecording, micPulse]);

  const onPressMic = useCallback(() => {
    if (uploadingMedia || sendMessageMutation.isPending) return;
    if (pendingVoice || selectedImage) return; // keep UX simple: one media type at a time
    if (isRecording) stopRecordingToPreview();
    else startRecording();
  }, [
    uploadingMedia,
    sendMessageMutation.isPending,
    pendingVoice,
    selectedImage,
    isRecording,
    startRecording,
    stopRecordingToPreview,
  ]);

  const pickImage = async () => {
    try {
      if (isRecording || pendingVoice) return;
      // Check & request permission
      const { status: existingStatus } =
        await ImagePicker.getMediaLibraryPermissionsAsync();
      let hasPermission = existingStatus === "granted";

      if (!hasPermission) {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        hasPermission = status === "granted";
      }

      if (!hasPermission) {
        Alert.alert(
          "Permission needed",
          "We need access to your gallery to send photos. Please enable photo permissions in your device settings."
        );
        return;
      }

      // Open gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedUri = result.assets[0].uri;
      setSelectedImage(selectedUri);
    } catch (error: any) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const send = useCallback(async () => {
    // Disable normal send while recording (voice notes auto-send on release)
    if (isRecording) return;
    // Allow sending if there's text OR an image OR a pending voice note
    const hasText = text && text.trim().length > 0;
    const hasImage = !!selectedImage;
    const hasVoice = !!pendingVoice;

    if (
      (!hasText && !hasImage && !hasVoice) ||
      sendMessageMutation.isPending ||
      uploadingMedia
    )
      return;

    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    // If voice note is pending, upload it first
    if (pendingVoice) {
      try {
        setUploadingMedia(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert("Error", "Please log in to send messages.");
          setUploadingMedia(false);
          return;
        }

        mediaUrl = await uploadChatVoice(
          pendingVoice.uri,
          chatId as string,
          user.id
        );
        mediaType = "audio";
      } catch (error: any) {
        console.error("Error uploading voice:", error);
        Alert.alert("Error", "Failed to upload voice note. Please try again.");
        setUploadingMedia(false);
        return;
      }
    }

    // If image is selected, upload it first
    if (selectedImage && !mediaUrl) {
      try {
        setUploadingMedia(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert("Error", "Please log in to send messages.");
          setUploadingMedia(false);
          return;
        }

        mediaUrl = await uploadChatMedia(
          selectedImage,
          chatId as string,
          user.id
        );
        mediaType = "image";
      } catch (error: any) {
        console.error("Error uploading media:", error);
        Alert.alert("Error", "Failed to upload image. Please try again.");
        setUploadingMedia(false);
        return;
      }
    }

    // Send message with text and/or media

    sendMessageMutation.mutate({
      content: hasText ? text.trim() : undefined,
      mediaUrl,
      mediaType,
      replyToId: replyingTo?.id,
    });
    setPendingVoice(null);
    setUploadingMedia(false);
  }, [
    text,
    selectedImage,
    pendingVoice,
    sendMessageMutation,
    uploadingMedia,
    chatId,
    isRecording,
    replyingTo,
  ]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const toggleVoicePlayback = useCallback(
    async (message: any) => {
      try {
        if (!message?.voice_url) return;

        // If tapping currently playing -> pause and clear
        if (playingMessageId === message.id && playingSoundRef.current) {
          const status: any = await playingSoundRef.current.getStatusAsync();
          if (status?.isLoaded && status?.isPlaying) {
            await playingSoundRef.current.pauseAsync();
            setPlayingMessageId(null);
            return;
          }
        }

        // Stop any existing sound (only one playing at a time)
        if (playingSoundRef.current) {
          try {
            await playingSoundRef.current.stopAsync();
          } catch { }
          try {
            await playingSoundRef.current.unloadAsync();
          } catch { }
          playingSoundRef.current = null;
        }

        setPlayingMessageId(message.id);
        const playableUrl = await getChatMediaUrl(message.voice_url);

        const { sound } = await Audio.Sound.createAsync(
          { uri: playableUrl },
          // Ensure frequent progress callbacks so the progress bar visibly moves.
          { shouldPlay: true, progressUpdateIntervalMillis: 250 },
          (status) => {
            if (!status.isLoaded) return;
            const pos = status.positionMillis ?? 0;
            const dur = status.durationMillis ?? 0;
            setPlaybackProgress((prev) => ({
              ...prev,
              [message.id]: { pos, dur },
            }));
            if (status.didJustFinish) setPlayingMessageId(null);
          }
        );

        // Immediately capture initial duration/position so the label shows right away
        // (some devices delay the first status callback).
        try {
          const initial: any = await sound.getStatusAsync();
          if (initial?.isLoaded) {
            setPlaybackProgress((prev) => ({
              ...prev,
              [message.id]: {
                pos: initial.positionMillis ?? 0,
                dur: initial.durationMillis ?? 0,
              },
            }));
          }
        } catch { }

        playingSoundRef.current = sound;
      } catch (e) {
        console.error("Voice playback error:", e);
        setPlayingMessageId(null);
      }
    },
    [playingMessageId]
  );

  // Cleanup voice playback on unmount
  useEffect(() => {
    return () => {
      if (playingSoundRef.current) {
        playingSoundRef.current.unloadAsync().catch(() => { });
        playingSoundRef.current = null;
      }
    };
  }, []);

  const fullName =
    otherUser?.first_name && otherUser?.last_name
      ? `${otherUser.first_name} ${otherUser.last_name}`
      : otherUser?.name || "Unknown";

  const mainPhoto = useMemo(() => {
    // Hide photo if blocked (scenario 3 & 4)
    if (isBlocked) return null;
    // Show photo for unmatched (scenario 1 & 2)
    return otherUser?.photos && otherUser.photos.length > 0
      ? cleanPhotoUrl(otherUser.photos[0])
      : null;
  }, [otherUser?.photos, isBlocked]);

  // Memoize message processing (deduplication, sorting, grouping)
  const groupedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    // Deduplicate messages by ID
    const messageMap = new Map();
    messages.forEach((msg: any) => {
      if (!messageMap.has(msg.id)) {
        messageMap.set(msg.id, msg);
      }
    });

    const uniqueMessages = Array.from(messageMap.values());

    // Sort by created_at
    uniqueMessages.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Group messages by date for timestamps
    return uniqueMessages.reduce((acc: any[], msg: any, index: number) => {
      const prevMsg = index > 0 ? uniqueMessages[index - 1] : null;
      const msgDate = new Date(msg.created_at);
      const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;

      // Add timestamp if it's a new day or first message
      if (!prevDate || msgDate.toDateString() !== prevDate.toDateString()) {
        acc.push({
          type: "timestamp",
          date: msgDate,
          id: `timestamp-${msgDate.toISOString().split("T")[0]}-${acc.length}`,
          _index: acc.length,
        });
      }
      acc.push({ ...msg, _index: acc.length });
      return acc;
    }, []);
  }, [messages]);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleMessageLongPress = useCallback(
    (message: any) => {
      if (!currentUser || message.sender_id !== currentUser.id) return;
      setPendingDeleteId((prev) =>
        prev === message.id ? null : message.id
      );
    },
    [currentUser]
  );

  const handleConfirmDelete = useCallback(
    async (messageId: string) => {
      try {
        const { error } = await supabase.functions.invoke("delete-message", {
          body: { messageId },
        });

        if (error) {
          console.error("Error deleting message:", error);
          Alert.alert("Error", "Failed to delete message. Please try again.");
          return;
        }

        setPendingDeleteId(null);
        queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
        queryClient.invalidateQueries({ queryKey: ["chat-list"] });
      } catch (e) {
        console.error("Error deleting message:", e);
        Alert.alert("Error", "Failed to delete message. Please try again.");
      }
    },
    [chatId, queryClient]
  );

  // Scroll to a specific message when tapping on reply preview
  const scrollToMessage = useCallback(
    (messageId: string) => {
      if (!flatListRef.current || !groupedMessages.length) return;

      // Find the index of the message in groupedMessages
      const index = groupedMessages.findIndex(
        (item: any) => item.id === messageId
      );
      if (index !== -1) {
        flatListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5, // Center the message on screen
        });
      }
    },
    [groupedMessages]
  );

  // Show loading state (chat data or gate check)
  if (isLoading || gateLoading) {
    return (
      <View className="flex-1 bg-[#FDFAF5] items-center justify-center">
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  // Show intent questions gate
  if (gateRequired && gateQuestions.length > 0) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-[#FDFAF5]"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {/* Header */}
        <View className="bg-[#FDFAF5] px-4 pt-12 pb-4 flex-row items-center border-b border-[#EDE5D5]">
          <Pressable onPress={() => router.replace("/(main)/chat")} className="mr-3">
            <Text className="text-[#1C1208] text-2xl font-semibold">←</Text>
          </Pressable>
          <Text className="text-[#1C1208] text-lg font-semibold flex-1" numberOfLines={1}>
            {gateOtherName}
          </Text>
        </View>

        {/* Gate content */}
        <FlatList
          data={gateQuestions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          ListHeaderComponent={
            <View className="mb-6">
              <View className="bg-[#B8860B]/10 rounded-2xl p-4 border border-[#B8860B]/30 mb-5">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="sparkles" size={20} color="#B8860B" />
                  <Text className="text-[#B8860B] text-base font-bold ml-2">
                    Before you chat
                  </Text>
                </View>
                <Text className="text-[#6B5D4F] text-sm leading-5">
                  {gateOtherName} has set a few questions they'd like you to answer before starting a conversation. Take a moment to respond thoughtfully.
                </Text>
              </View>
            </View>
          }
          renderItem={({ item, index }) => (
            <View key={item.id} className="mb-5">
              <Text className="text-[#1C1208] text-base font-semibold mb-2">
                {index + 1}. {item.question_text}
              </Text>
              <TextInput
                value={gateAnswers[item.id] || ""}
                onChangeText={(val) =>
                  setGateAnswers((prev) => ({ ...prev, [item.id]: val }))
                }
                placeholder="Type your answer..."
                placeholderTextColor="#B0A090"
                multiline
                className="bg-white border border-[#EDE5D5] rounded-xl px-4 py-3 text-[#1C1208] text-base"
                style={{ textAlignVertical: "top", minHeight: 80 }}
              />
            </View>
          )}
          ListFooterComponent={
            <Pressable
              onPress={submitGateAnswers}
              disabled={gateSubmitting}
              className={`bg-[#B8860B] rounded-2xl py-4 items-center mt-2 ${gateSubmitting ? "opacity-60" : ""}`}
            >
              {gateSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-base font-bold">
                  Submit & Start Chatting
                </Text>
              )}
            </Pressable>
          }
        />
      </KeyboardAvoidingView>
    );
  }

  // Show waiting screen — acceptor waits for sender to answer questions
  if (waitingForOther) {
    const otherPhoto = otherUser
      ? cleanPhotoUrl(otherUser.photos?.[0] ?? null)
      : null;

    return (
      <View className="flex-1 bg-[#FDFAF5]">
        {/* Header */}
        <View className="bg-[#FDFAF5] px-4 pt-12 pb-4 flex-row items-center border-b border-[#EDE5D5]">
          <Pressable onPress={() => router.replace("/(main)/chat")} className="mr-3">
            <Text className="text-[#1C1208] text-2xl font-semibold">←</Text>
          </Pressable>
          <Text className="text-[#1C1208] text-lg font-semibold flex-1" numberOfLines={1}>
            {waitingOtherName}
          </Text>
        </View>

        <FlatList
          data={waitingQuestions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
          ListHeaderComponent={
            <View className="items-center mb-8">
              {/* Avatar */}
              <View className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-[#B8860B]/30 bg-[#F5F0E8] items-center justify-center">
                {otherPhoto ? (
                  <ExpoImage
                    source={{ uri: otherPhoto }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={{ fontSize: 40 }}>👤</Text>
                )}
              </View>

              {/* Waiting message */}
              <View className="bg-[#FFF8E7] border border-[#B8860B]/30 rounded-2xl px-5 py-4 w-full">
                <View className="flex-row items-center justify-center mb-2">
                  <Ionicons name="time-outline" size={22} color="#B8860B" />
                  <Text className="text-[#B8860B] text-base font-bold ml-2">
                    Waiting for {waitingOtherName}
                  </Text>
                </View>
                <Text className="text-[#6B5D4F] text-sm text-center leading-5">
                  {waitingOtherName} needs to answer your questions before you can start chatting. You'll be notified when they respond.
                </Text>
              </View>

              {waitingQuestions.length > 0 && (
                <Text className="text-[#9E8E7E] text-sm font-semibold mt-6 mb-2 self-start">
                  Your questions for {waitingOtherName}:
                </Text>
              )}
            </View>
          }
          renderItem={({ item, index }) => (
            <View className="bg-white border border-[#EDE5D5] rounded-2xl p-4 mb-3">
              <Text className="text-[#B8860B] text-xs font-bold mb-1 uppercase tracking-wider">
                Question {index + 1}
              </Text>
              <Text className="text-[#1C1208] text-sm leading-5">{item.question_text}</Text>
            </View>
          )}
          ListFooterComponent={
            <Pressable
              onPress={() => router.replace("/(main)/chat")}
              className="mt-6 py-3 rounded-2xl items-center border border-[#EDE5D5]"
            >
              <Text className="text-[#9E8E7E] text-sm font-medium">Back to Chats</Text>
            </Pressable>
          }
        />
      </View>
    );
  }

  // Show awaiting approval screen — initiator submitted answers, waiting for acceptor to review
  if (awaitingApproval) {
    const otherPhoto = otherUser ? cleanPhotoUrl(otherUser.photos?.[0] ?? null) : null;
    return (
      <View className="flex-1 bg-[#FDFAF5]">
        <View className="bg-[#FDFAF5] px-4 pt-12 pb-4 flex-row items-center border-b border-[#EDE5D5]">
          <Pressable onPress={() => router.replace("/(main)/chat")} className="mr-3">
            <Text className="text-[#1C1208] text-2xl font-semibold">←</Text>
          </Pressable>
          <Text className="text-[#1C1208] text-lg font-semibold flex-1" numberOfLines={1}>
            {awaitingOtherName}
          </Text>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <View className="w-24 h-24 rounded-full overflow-hidden mb-6 border-4 border-[#B8860B]/30 bg-[#F5F0E8] items-center justify-center">
            {otherPhoto ? (
              <ExpoImage source={{ uri: otherPhoto }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : (
              <Text style={{ fontSize: 40 }}>👤</Text>
            )}
          </View>

          <View className="bg-[#FFF8E7] border border-[#B8860B]/30 rounded-2xl px-5 py-5 w-full mb-6">
            <View className="flex-row items-center justify-center mb-3">
              <Ionicons name="time-outline" size={22} color="#B8860B" />
              <Text className="text-[#B8860B] text-base font-bold ml-2">Answers Submitted!</Text>
            </View>
            <Text className="text-[#6B5D4F] text-sm text-center leading-5">
              Your answers have been sent to {awaitingOtherName}. Once they review and approve, you'll both be able to chat freely.
            </Text>
          </View>

          <Pressable
            onPress={() => router.replace("/(main)/chat")}
            className="py-3 px-6 rounded-2xl items-center border border-[#EDE5D5]"
          >
            <Text className="text-[#9E8E7E] text-sm font-medium">Back to Chats</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Show review answers screen — acceptor reviews initiator's answers and can approve
  if (reviewRequired) {
    const otherPhoto = otherUser ? cleanPhotoUrl(otherUser.photos?.[0] ?? null) : null;
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-[#FDFAF5]"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="bg-[#FDFAF5] px-4 pt-12 pb-4 flex-row items-center border-b border-[#EDE5D5]">
          <Pressable onPress={() => router.replace("/(main)/chat")} className="mr-3">
            <Text className="text-[#1C1208] text-2xl font-semibold">←</Text>
          </Pressable>
          <Text className="text-[#1C1208] text-lg font-semibold flex-1" numberOfLines={1}>
            {reviewOtherName}
          </Text>
        </View>

        <FlatList
          data={reviewAnswers}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          ListHeaderComponent={
            <View className="mb-6">
              {/* Avatar + name */}
              <View className="items-center mb-5">
                <View className="w-20 h-20 rounded-full overflow-hidden mb-3 border-4 border-[#B8860B]/30 bg-[#F5F0E8] items-center justify-center">
                  {otherPhoto ? (
                    <ExpoImage source={{ uri: otherPhoto }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  ) : (
                    <Text style={{ fontSize: 36 }}>👤</Text>
                  )}
                </View>
                <Text className="text-[#1C1208] text-base font-semibold">{reviewOtherName}</Text>
              </View>

              <View className="bg-[#B8860B]/10 rounded-2xl p-4 border border-[#B8860B]/30">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="document-text-outline" size={20} color="#B8860B" />
                  <Text className="text-[#B8860B] text-base font-bold ml-2">Review Their Answers</Text>
                </View>
                <Text className="text-[#6B5D4F] text-sm leading-5">
                  {reviewOtherName} answered your questions. Review their responses below and approve to start chatting.
                </Text>
              </View>
            </View>
          }
          renderItem={({ item, index }) => (
            <View key={index} className="mb-4 bg-white rounded-2xl border border-[#EDE5D5] overflow-hidden">
              <View className="px-4 py-3 bg-[#F5F0E8] border-b border-[#EDE5D5]">
                <Text className="text-[#B8860B] text-xs font-bold uppercase tracking-wider">
                  Question {index + 1}
                </Text>
                <Text className="text-[#1C1208] text-sm font-semibold mt-0.5">{item.question_text}</Text>
              </View>
              <View className="px-4 py-3">
                <Text className="text-[#3D2C1E] text-sm leading-5">{item.answer_text}</Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            <Pressable
              onPress={approveGate}
              disabled={reviewApproving}
              className={`bg-[#B8860B] rounded-2xl py-4 items-center mt-2 ${reviewApproving ? "opacity-60" : ""}`}
              style={{
                shadowColor: "#B8860B",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.45,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              {reviewApproving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color="#1C1208" style={{ marginRight: 8 }} />
                  <Text className="text-[#1C1208] text-base font-bold">Approve & Start Chatting</Text>
                </View>
              )}
            </Pressable>
          }
        />
      </KeyboardAvoidingView>
    );
  }

  // Show error state
  if (error) {
    return (
      <View className="flex-1 bg-[#FDFAF5] items-center justify-center px-4">
        <Text className="text-red-500 text-center mb-4">
          Error loading chat: {error.message}
        </Text>
        <Pressable
          className="bg-[#B8860B] px-6 py-3 rounded-full"
          onPress={() =>
            queryClient.invalidateQueries({ queryKey: ["chat", chatId] })
          }
        >
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#FDFAF5]"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      onTouchStart={() => {
        if (pendingDeleteId) setPendingDeleteId(null);
      }}
    >
      {/* Header */}
      <View className="bg-[#FDFAF5] px-4 pt-12 pb-4 flex-row items-start border-b border-[#EDE5D5]">
        <Pressable
          onPress={() => {
            // Invalidate chat list cache to refresh unread counts
            queryClient.invalidateQueries({ queryKey: ["chat-list"] });
            // Always navigate to chat list instead of going back
            // This ensures we don't go back to swipe screen or profile screen
            router.replace("/(main)/chat");
          }}
          className="mr-3 mt-1"
        >
          <Text className="text-[#1C1208] text-2xl font-semibold">←</Text>
        </Pressable>

        <Pressable
          className="flex-1 flex-row items-center"
          onPress={() => {
            // Scenario 3 & 4: Show alert when name is tapped if blocked
            if (isBlocked) {
              Alert.alert(
                "User Information",
                `This user (${fullName}) may have blocked you or deleted their account.`
              );
              return;
            }
            // Normal behavior: navigate to profile preview
            // Pass chatId so we can navigate back to the chat screen
            if (otherUser?.id && chatId) {
              router.push(`/(main)/chat/user-profile?userId=${otherUser.id}&chatId=${chatId}`);
            }
          }}
        >
          <View className="relative mr-3">
            {mainPhoto && !isBlocked ? (
              <Image
                source={{ uri: mainPhoto }}
                className="w-14 h-14 rounded-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-14 h-14 rounded-full bg-[#F5F0E8] items-center justify-center">
                <Text className="text-[#9E8E7E] text-xl">👤</Text>
              </View>
            )}
            {/* Active indicator - only show if not blocked */}
            {otherUserActive && !isBlocked && (
              <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
            )}
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-[#1C1208] text-lg font-semibold">{fullName}</Text>
              {otherUserCertification?.is_certified && otherUserCertification?.show_badge && (
                <View className="ml-2">
                  <MarriageFoundationsBadge size="small" showText={false} />
                </View>
              )}
            </View>
            {otherUserActive && !isOtherUserTyping && !isBlocked && (
              <Text className="text-green-500 text-xs mt-0.5">Active now</Text>
            )}
            {isBlocked && (
              <Text className="text-[#9E8E7E] text-xs mt-0.5">
                Tap name for info
              </Text>
            )}
          </View>
        </Pressable>

        {/* Three dots menu */}
        <Pressable
          onPress={() => setShowOptionsModal(true)}
          className="ml-2 mt-1 p-2"
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#1C1208" />
        </Pressable>
      </View>
      {/* Wali / Chaperone presence banner */}
      {hasChaperone && (
        <View className="bg-[#B8860B]/20 px-3 py-1.5 flex-row items-center gap-1.5 mx-4 mb-2 rounded-xl" style={{ marginTop: 8 }}>
          <Ionicons name="shield-checkmark" size={14} color="#B8860B" />
          <Text className="text-[#B8860B] text-xs font-medium">A Wali is present in this conversation</Text>
        </View>
      )}

      {/* Compliment Message Display - shown like a normal message (left if received, right if sent) */}
      {/* Show for both pending and accepted compliments (accepted means match was created) */}
      {isCompliment &&
        (complimentStatus === "pending" || complimentStatus === "accepted") &&
        chatData?.complimentMessage && (
          <View className="px-4 pt-6">
            {/* If current user is the sender, show on right; if recipient, show on left */}
            <View className={`mb-2 flex-row ${isComplimentSender ? "justify-end" : "justify-start"} items-end`}>
              {/* Sender Avatar - only show if recipient (left side) */}
              {!isComplimentSender && (
                <View className="mr-2 mb-1">
                  {mainPhoto ? (
                    <Image
                      source={{ uri: mainPhoto }}
                      className="w-8 h-8 rounded-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-8 h-8 rounded-full bg-[#F5F0E8] items-center justify-center">
                      <Text className="text-[#9E8E7E] text-xs">👤</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Message Bubble */}
              <View className={`max-w-[75%] ${isComplimentSender ? "items-end" : "items-start"}`}>
                <View className={`${isComplimentSender 
                  ? "bg-[#B8860B] rounded-2xl rounded-br-sm" 
                  : "bg-[#F5F0E8] rounded-2xl rounded-bl-sm border border-[#B8860B]/20"
                } px-4 py-3`}>
                  <Text className={`text-base leading-6 ${isComplimentSender ? "text-white" : "text-[#1C1208]"}`}>
                    {chatData.complimentMessage}
                  </Text>
                </View>

                {/* Timestamp */}
                <Text className={`text-xs mt-1 ${isComplimentSender ? "text-white/40 mr-1" : "text-[#9E8E7E] ml-1"}`}>
                  {new Date(
                    chatData.complimentCreatedAt || Date.now()
                  ).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          </View>
        )}

      {/* Messages */}
      {isBlocked ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-[#9E8E7E] text-center text-base mb-2">
            {iAmBlocked
              ? "This user has blocked you. You cannot see their profile or messages."
              : "You have blocked this user. Messages are hidden but preserved for safety."}
          </Text>
          {iAmBlocked && (
            <Text className="text-[#C9BFB5] text-center text-sm mt-2">
              Chat history is preserved for abuse reporting purposes.
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={groupedMessages}
          keyExtractor={(item, index) => {
            if (item.type === "timestamp") {
              return `timestamp-${item._index !== undefined ? item._index : index
                }`;
            }
            // Combine ID and index to ensure absolute uniqueness
            return `msg-${item.id}-${item._index !== undefined ? item._index : index
              }`;
          }}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={20}
          windowSize={10}
          // Optimize scroll events
          onScrollToIndexFailed={() => { }}
          ListHeaderComponent={
            (interestQA || gateQA) ? (
              <View>
              {gateQA && gateQA.pairs?.length > 0 && gateQAVisible && (
                <LinearGradient
                  colors={["rgba(184,134,11,0.13)", "rgba(212,160,23,0.05)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: "rgba(184,134,11,0.28)",
                    marginBottom: 12,
                    overflow: "hidden",
                  }}
                >
                  {/* Header row */}
                  <View style={{ flexDirection: "row", alignItems: "center", padding: 16, paddingBottom: 12 }}>
                    <View
                      style={{
                        width: 40, height: 40, borderRadius: 20,
                        backgroundColor: "rgba(184,134,11,0.13)",
                        alignItems: "center", justifyContent: "center",
                        borderWidth: 1, borderColor: "rgba(184,134,11,0.22)",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name="shield-checkmark" size={20} color="#B8860B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "rgba(184,134,11,0.65)", fontSize: 9, fontWeight: "700", letterSpacing: 2.2, textTransform: "uppercase", marginBottom: 2 }}>
                        IKHTIAR
                      </Text>
                      <Text style={{ color: "#1C1208", fontSize: 15, fontWeight: "800" }}>
                        Intent Answers
                      </Text>
                    </View>
                    <Pressable
                      onPress={dismissGateQA}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 6,
                        borderRadius: 10,
                        backgroundColor: "rgba(184,134,11,0.1)",
                        borderWidth: 1, borderColor: "rgba(184,134,11,0.2)",
                      }}
                    >
                      <Text style={{ color: "#B8860B", fontSize: 11, fontWeight: "700" }}>Remove</Text>
                    </Pressable>
                  </View>

                  {/* Subtitle */}
                  <Text style={{ color: "#9E8E7E", fontSize: 12, lineHeight: 17, paddingHorizontal: 16, paddingBottom: 14 }}>
                    {gateQA.answererName} answered these questions before starting the conversation
                  </Text>

                  {/* Q&A pairs */}
                  <View
                    style={{
                      marginHorizontal: 16,
                      marginBottom: 16,
                      backgroundColor: "rgba(0,0,0,0.04)",
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "rgba(184,134,11,0.1)",
                      overflow: "hidden",
                    }}
                  >
                    {gateQA.pairs.map((qa: any, index: number) => (
                      <View
                        key={`gate-${index}`}
                        style={{
                          padding: 14,
                          borderBottomWidth: index < gateQA.pairs.length - 1 ? 1 : 0,
                          borderBottomColor: "rgba(184,134,11,0.1)",
                        }}
                      >
                        <Text style={{ color: "#9E8E7E", fontSize: 12, marginBottom: 4 }}>{qa.question}</Text>
                        <Text style={{ color: "#1C1208", fontSize: 14, fontWeight: "500", lineHeight: 20 }}>{qa.answer}</Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              )}
              {interestQA ? (
              <View className="bg-[#B8860B]/10 rounded-2xl border border-[#B8860B]/30 mx-0 mb-4 p-4">
                <Pressable
                  onPress={() =>
                    setIsQAExpanded((prev) =>
                      prev === null ? !(messages.length > 0) : !prev
                    )
                  }
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-row items-center">
                    <Ionicons name="sparkles" size={18} color="#B8860B" />
                    <Text className="text-[#B8860B] text-base font-bold ml-2">
                      Conversation Starters
                    </Text>
                  </View>
                  <Ionicons
                    name={
                      (isQAExpanded === null ? messages.length === 0 : isQAExpanded)
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    size={20}
                    color="#B8860B"
                  />
                </Pressable>

                {(isQAExpanded === null ? messages.length === 0 : isQAExpanded) && (
                  <View className="mt-4">
                    {/* Sender's Answers */}
                    {interestQA.senderAnswers?.length > 0 && (
                      <View className="mb-3">
                        <Text className="text-[#B8860B] text-sm font-semibold mb-2">
                          {interestQA.senderName}'s Answers
                        </Text>
                        {interestQA.senderAnswers.map(
                          (qa: any, index: number) => (
                            <View
                              key={`sender-${index}`}
                              className={`${
                                index < interestQA.senderAnswers.length - 1
                                  ? "mb-3 pb-3 border-b border-[#EDE5D5]"
                                  : ""
                              }`}
                            >
                              <Text className="text-[#9E8E7E] text-sm mb-1">
                                {qa.question}
                              </Text>
                              <Text className="text-[#1C1208] text-base">
                                {qa.answer}
                              </Text>
                            </View>
                          )
                        )}
                      </View>
                    )}

                    {/* Recipient's Answers */}
                    {interestQA.recipientAnswers?.length > 0 && (
                      <View
                        className={
                          interestQA.senderAnswers?.length > 0
                            ? "mt-2 pt-3 border-t border-[#B8860B]/20"
                            : ""
                        }
                      >
                        <Text className="text-[#B8860B] text-sm font-semibold mb-2">
                          {interestQA.recipientName}'s Answers
                        </Text>
                        {interestQA.recipientAnswers.map(
                          (qa: any, index: number) => (
                            <View
                              key={`recipient-${index}`}
                              className={`${
                                index < interestQA.recipientAnswers.length - 1
                                  ? "mb-3 pb-3 border-b border-[#EDE5D5]"
                                  : ""
                              }`}
                            >
                              <Text className="text-[#9E8E7E] text-sm mb-1">
                                {qa.question}
                              </Text>
                              <Text className="text-[#1C1208] text-base">
                                {qa.answer}
                              </Text>
                            </View>
                          )
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
              ) : null}
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.type === "timestamp") {
              return (
                <View className="items-center my-4">
                  <Text className="text-[#9E8E7E] text-xs">
                    {item.date.toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year:
                        item.date.getFullYear() !== new Date().getFullYear()
                          ? "numeric"
                          : undefined,
                    })}
                  </Text>
                </View>
              );
            }

            const isMe = item.sender_id === currentUser?.id;
            const prog = playbackProgress[item.id] ?? { pos: 0, dur: 0 };
            const progress = prog.dur > 0 ? prog.pos / prog.dur : 0;
            const durationLabel =
              prog.dur > 0
                ? playingMessageId === item.id
                  ? `${formatTime(prog.pos)} / ${formatTime(prog.dur)}`
                  : `${formatTime(prog.dur)}`
                : "…";

            return (
              <MessageItem
                item={item}
                isMe={isMe}
                mainPhoto={mainPhoto}
                otherUser={otherUser}
                currentUser={currentUser}
                onReply={setReplyingTo}
                onImagePress={setFullScreenImage}
                onToggleVoice={toggleVoicePlayback}
                onScrollToMessage={scrollToMessage}
                isVoicePlaying={playingMessageId === item.id}
                voiceProgress={progress}
                voiceDurationLabel={durationLabel}
                onLongPress={handleMessageLongPress}
                showDeleteLabel={
                  isMe &&
                  pendingDeleteId === item.id &&
                  item.media_type !== "deleted"
                }
                onDeletePress={() => handleConfirmDelete(item.id)}
                onTap={() => {
                  if (pendingDeleteId) setPendingDeleteId(null);
                }}
              />
            );
          }}
          ListEmptyComponent={
            !isCompliment ? (
              <View className="items-center justify-center py-20">
                <View className="bg-[#F5F0E8] px-4 py-3 rounded-2xl mb-4">
                  <Text className="text-[#6B5D4F] text-sm text-center">
                    Start the chat with {fullName}
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListFooterComponent={
            isOtherUserTyping ? (
              <View className="mb-2 flex-row justify-start items-end">
                <View className="mr-2 mb-1">
                  {mainPhoto ? (
                    <Image
                      source={{ uri: mainPhoto }}
                      className="w-8 h-8 rounded-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-8 h-8 rounded-full bg-[#F5F0E8] items-center justify-center">
                      <Text className="text-[#9E8E7E] text-xs">👤</Text>
                    </View>
                  )}
                </View>
                <View className="max-w-[75%] items-start">
                  <View className="bg-[#F5F0E8] rounded-2xl rounded-bl-sm px-4 py-2.5">
                    <Text className="text-[#9E8E7E] text-sm italic">
                      typing...
                    </Text>
                  </View>
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* Rematch Request UI - Show for unmatched scenarios (1 & 2) */}
      {isUnmatched && !isBlocked && (
        <View className="px-4 py-4 bg-[#FDFAF5] border-t border-[#EDE5D5]">
          {rematchRequest?.isRequestRecipient ? (
            // User is recipient - show accept/reject buttons
            <View>
              <Text className="text-[#1C1208] text-center text-base mb-4">
                {fullName} has requested to rematch
              </Text>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={async () => {
                    try {
                      const { error } = await supabase.functions.invoke(
                        "reject-rematch",
                        {
                          body: { matchId: chatId },
                        }
                      );

                      if (error) {
                        Alert.alert(
                          "Error",
                          "Failed to reject rematch. Please try again."
                        );
                        return;
                      }

                      // Navigate back to chat list (chat will be removed from list)
                      queryClient.invalidateQueries({
                        queryKey: ["chat-list"],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["chat", chatId],
                      });
                      router.back();
                    } catch (error) {
                      console.error("Error rejecting rematch:", error);
                      Alert.alert(
                        "Error",
                        "Failed to reject rematch. Please try again."
                      );
                    }
                  }}
                  className="flex-1 bg-[#F5F0E8] px-6 py-4 rounded-2xl items-center border border-[#EDE5D5]"
                >
                  <Text className="text-[#1C1208] text-base font-semibold">
                    Reject
                  </Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    try {
                      const { error, data } = await supabase.functions.invoke(
                        "accept-rematch",
                        {
                          body: { matchId: chatId },
                        }
                      );

                      if (error) {
                        Alert.alert(
                          "Error",
                          "Failed to accept rematch. Please try again."
                        );
                        return;
                      }

                      // Refresh chat data and navigate to new match
                      queryClient.invalidateQueries({
                        queryKey: ["chat-list"],
                      });
                      if (data?.matchId) {
                        router.replace(`/(main)/chat/${data.matchId}`);
                      } else {
                        queryClient.invalidateQueries({
                          queryKey: ["chat", chatId],
                        });
                      }
                    } catch (error) {
                      console.error("Error accepting rematch:", error);
                      Alert.alert(
                        "Error",
                        "Failed to accept rematch. Please try again."
                      );
                    }
                  }}
                  className="flex-1 bg-[#B8860B] px-6 py-4 rounded-2xl items-center"
                >
                  <Text className="text-[#1C1208] text-base font-semibold">
                    Accept Rematch
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : rematchRequest?.isRequestRequester ? (
            // User is requester - show waiting message
            <View className="items-center">
              <Text className="text-[#6B5D4F] text-center text-base mb-2">
                Rematch request sent
              </Text>
              <Text className="text-[#9E8E7E] text-center text-sm">
                Waiting for {fullName} to respond...
              </Text>
            </View>
          ) : rematchRequest?.wasRejected && rematchRequest?.requestedBy === currentUserId ? (
            // User's rematch request was rejected - show rejection message
            <View className="items-center px-4">
              <Text className="text-red-400 text-center text-base mb-2 font-semibold">
                Your rematch request has been rejected
              </Text>
              <Text className="text-[#9E8E7E] text-center text-sm">
                You can&apos;t contact them anymore
              </Text>
            </View>
          ) : rematchRequest?.hasAlreadyRequested ? (
            // User has already requested (but not rejected yet) - show message
            <View className="items-center">
              <Text className="text-[#6B5D4F] text-center text-base mb-2">
                Rematch request unavailable
              </Text>
              <Text className="text-[#9E8E7E] text-center text-sm">
                You have already requested a rematch.
              </Text>
            </View>
          ) : (
            // No request - show request button
            <Pressable
              onPress={async () => {
                Alert.alert(
                  "Request Rematch",
                  `Would you like to request a rematch with ${fullName}?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Request Rematch",
                      onPress: async () => {
                        try {
                          const { error } = await supabase.functions.invoke(
                            "request-rematch",
                            {
                              body: {
                                matchId: chatId,
                                otherUserId: otherUser?.id,
                              },
                            }
                          );

                          if (error) {
                            Alert.alert(
                              "Error",
                              "Failed to request rematch. Please try again."
                            );
                            return;
                          }

                          Alert.alert("Success", "Rematch request sent!");
                          // Refresh chat data
                          queryClient.invalidateQueries({
                            queryKey: ["chat", chatId],
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["chat-list"],
                          });
                        } catch (error) {
                          console.error("Error requesting rematch:", error);
                          Alert.alert(
                            "Error",
                            "Failed to request rematch. Please try again."
                          );
                        }
                      },
                    },
                  ]
                );
              }}
              className="bg-[#B8860B] px-6 py-4 rounded-2xl items-center"
            >
              <Text className="text-[#1C1208] text-base font-semibold">
                Request Rematch?
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Compliment Accept/Decline Section */}
      {isCompliment &&
        isComplimentRecipient &&
        complimentStatus === "pending" && (
          <View className="px-4 py-4 bg-white border-t border-[#EDE5D5]">
            <View className="items-center mb-4">
              <Text className="text-[#1C1208] text-lg font-bold mb-1">
                {fullName} sent you a compliment! 💬
              </Text>
              <Text className="text-[#6B5D4F] text-sm text-center">
                View their profile and decide if you&apos;d like to match
              </Text>
            </View>
            <View className="flex-row gap-3">
              <Pressable
                onPress={async () => {
                  Alert.alert(
                    "Decline Compliment",
                    `Are you sure you want to decline ${fullName}'s compliment?`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Decline",
                        style: "destructive",
                        onPress: async () => {
                          try {
                            const { error } = await supabase.functions.invoke(
                              "decline-compliment",
                              {
                                body: { complimentId },
                              }
                            );

                            if (error) {
                              Alert.alert(
                                "Error",
                                "Failed to decline compliment. Please try again."
                              );
                              return;
                            }

                            // Navigate back to chat list (compliment will be removed)
                            queryClient.invalidateQueries({
                              queryKey: ["chat-list"],
                            });
                            router.back();
                          } catch (error) {
                            console.error("Error declining compliment:", error);
                            Alert.alert(
                              "Error",
                              "Failed to decline compliment. Please try again."
                            );
                          }
                        },
                      },
                    ]
                  );
                }}
                className="flex-1 bg-[#F5F0E8] px-6 py-4 rounded-2xl items-center border border-[#EDE5D5]"
              >
                <Text className="text-[#1C1208] text-base font-semibold">
                  Decline
                </Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  Alert.alert(
                    "Accept Compliment",
                    `Accept ${fullName}'s compliment and start chatting?`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Accept & Match",
                        onPress: async () => {
                          try {
                            const { error, data } =
                              await supabase.functions.invoke(
                                "accept-compliment",
                                {
                                  body: { complimentId },
                                }
                              );

                            if (error) {
                              Alert.alert(
                                "Error",
                                "Failed to accept compliment. Please try again."
                              );
                              return;
                            }

                            // Navigate to the new match chat
                            queryClient.invalidateQueries({
                              queryKey: ["chat-list"],
                            });
                            if (data?.matchId) {
                              router.replace(`/(main)/chat/${data.matchId}`);
                            } else {
                              queryClient.invalidateQueries({
                                queryKey: ["chat", chatId],
                              });
                            }
                          } catch (error) {
                            console.error("Error accepting compliment:", error);
                            Alert.alert(
                              "Error",
                              "Failed to accept compliment. Please try again."
                            );
                          }
                        },
                      },
                    ]
                  );
                }}
                className="flex-1 bg-[#B8860B] px-6 py-4 rounded-2xl items-center"
              >
                <Text className="text-[#1C1208] text-base font-semibold">
                  Accept & Match
                </Text>
              </Pressable>
            </View>
          </View>
        )}

      {/* Compliment Sender Status - Only show if pending or declined, not if accepted (match created) */}
      {isCompliment && isComplimentSender && complimentStatus !== "accepted" && (
        <View className="px-4 py-4 bg-white border-t border-[#EDE5D5]">
          {complimentStatus === "pending" ? (
            <View className="items-center">
              <Text className="text-[#6B5D4F] text-center text-base mb-2">
                Compliment sent! 💬
              </Text>
              <Text className="text-[#9E8E7E] text-center text-sm">
                Waiting for {fullName} to respond...
              </Text>
            </View>
          ) : complimentStatus === "declined" ? (
            <View className="items-center">
              <Text className="text-[#6B5D4F] text-center text-base mb-2">
                Compliment declined
              </Text>
              <Text className="text-[#9E8E7E] text-center text-sm">
                {fullName} declined your compliment
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Reply Preview */}
      {replyingTo && (
        <View className="px-4 py-2 bg-[#FDFAF5] border-t border-[#EDE5D5]">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-2">
              <View className="flex-row items-center mb-1">
                <Ionicons name="arrow-undo" size={16} color="#B8860B" />
                <Text className="text-[#B8860B] text-xs font-semibold ml-1">
                  Replying to{" "}
                  {replyingTo.sender_id === currentUser?.id
                    ? "yourself"
                    : otherUser?.first_name || "User"}
                </Text>
              </View>
              <View className="pl-5 border-l-2 border-[#B8860B]/50">
                {replyingTo.image_url ? (
                  <Text className="text-[#9E8E7E] text-xs italic">📷 Photo</Text>
                ) : replyingTo.voice_url ? (
                  <Text className="text-[#9E8E7E] text-xs italic">
                    🎤 Voice note
                  </Text>
                ) : (
                  <Text className="text-[#9E8E7E] text-xs" numberOfLines={1}>
                    {replyingTo.content || "Message"}
                  </Text>
                )}
              </View>
            </View>
            <Pressable
              onPress={() => setReplyingTo(null)}
              className="w-6 h-6 rounded-full bg-[#F5F0E8] items-center justify-center"
            >
              <Ionicons name="close" size={16} color="#9E8E7E" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Image Preview */}
      {selectedImage && (
        <View className="px-4 py-2 bg-[#FDFAF5] border-t border-[#EDE5D5]">
          <View className="relative">
            <ExpoImage
              source={{ uri: selectedImage }}
              style={{ width: 100, height: 100, borderRadius: 12 }}
              contentFit="cover"
            />
            <Pressable
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 items-center justify-center"
              onPress={() => setSelectedImage(null)}
            >
              <Ionicons name="close" size={16} color="#9E8E7E" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Voice Note Preview */}
      {pendingVoice && (
        <View className="px-4 py-2 bg-[#FDFAF5] border-t border-[#EDE5D5]">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-[#F5F0E8] items-center justify-center border border-[#B8860B]/30">
                <Ionicons name="mic" size={18} color="#B8860B" />
              </View>
              <View className="ml-3">
                <Text className="text-[#1C1208] text-sm font-semibold">
                  Voice note ready
                </Text>
                <Text className="text-[#9E8E7E] text-xs">
                  {formatTime(pendingVoice.durationMs)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <Pressable
                onPress={() => setPendingVoice(null)}
                className="w-9 h-9 rounded-full bg-red-500 items-center justify-center mr-2"
                disabled={uploadingMedia || sendMessageMutation.isPending}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={send}
                className="px-4 h-9 rounded-full bg-[#B8860B] items-center justify-center"
                disabled={uploadingMedia || sendMessageMutation.isPending}
              >
                {uploadingMedia ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-[#1C1208] text-sm font-semibold">Send</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Input - Hide if blocked, unmatched, or compliment (only if still pending) */}
      {/* Show input if compliment is accepted (match created) */}
      {!isBlocked && !isUnmatched && (!isCompliment || complimentStatus === "accepted") && (
        <View
          className="bg-[#FDFAF5] px-4 py-3"
          style={{ paddingBottom: Platform.OS === "ios" ? 20 : 10 }}
        >
          {/* Strict halal warning (only visible to sender) */}
          {halalWarning && (
            <View className="mb-2 px-3 py-2 rounded-xl border border-red-500/40 bg-red-500/10">
              <Text className="text-red-200 text-xs">{halalWarning}</Text>
            </View>
          )}

          <View className="flex-row items-center gap-3">
            {/* Add/Attachment Button */}
            <Pressable
              className="w-10 h-10 rounded-full bg-[#F5F0E8] items-center justify-center border border-[#B8860B]/30"
              onPress={pickImage}
              disabled={uploadingMedia || isRecording || !!pendingVoice}
            >
              <Ionicons name="add" size={24} color="#B8860B" />
            </Pressable>

            {/* Mic Button (tap to start, tap again to stop; then send/cancel) */}
            {/* <Pressable
              onPress={onPressMic}
              disabled={
                uploadingMedia ||
                sendMessageMutation.isPending ||
                !!pendingVoice ||
                !!selectedImage
              }
            >
              <Animated.View style={micPulseStyle}>
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center border ${isRecording
                    ? "bg-red-500/20 border-red-500/50"
                    : "bg-[#F5F0E8] border-[#B8860B]/30"
                    }`}
                >
                  <Ionicons
                    name={isRecording ? "stop" : "mic"}
                    size={20}
                    color={isRecording ? "#EF4444" : "#B8860B"}
                  />
                </View>
              </Animated.View>
            </Pressable> */}

            {/* Message Input Field */}
            <TextInput
              className="flex-1 bg-white text-[#1C1208] px-4 py-3 rounded-2xl border border-[#EDE5D5]"
              placeholder={isRecording ? "Recording..." : "Type a message..."}
              placeholderTextColor="#9E8E7E"
              value={text}
              onChangeText={handleTextChange}
              multiline
              maxLength={500}
              editable={!isRecording}
              style={{
                maxHeight: 100,
                fontSize: 16,
                opacity: isRecording ? 0.5 : 1,
              }}
              returnKeyType="send"
              onSubmitEditing={send}
            />

            {/* Send Button */}
            <Pressable
              onPress={send}
              disabled={
                isRecording ||
                ((!text || !text.trim()) && !selectedImage && !pendingVoice) ||
                sendMessageMutation.isPending ||
                uploadingMedia
              }
              className={`w-10 h-10 rounded-full bg-[#B8860B] items-center justify-center ${isRecording ||
                ((!text || !text.trim()) && !selectedImage && !pendingVoice)
                ? "opacity-50"
                : ""
                }`}
            >
              {uploadingMedia ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </View>

          {/* Recording feedback */}
          {isRecording && (
            <View className="mt-2 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-red-500" />
                <Text className="text-[#6B5D4F] text-xs ml-2">
                  {`Recording • ${recordSeconds}s`}
                </Text>
              </View>
              <Text className="text-[#C9BFB5] text-xs">Tap mic to stop</Text>
            </View>
          )}
        </View>
      )}

      {/* Full Screen Image Viewer */}
      <Modal
        visible={!!fullScreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View className="flex-1 bg-black">
          {/* Close Button */}
          <Pressable
            onPress={() => setFullScreenImage(null)}
            className="absolute top-12 right-4 z-10 w-10 h-10 rounded-full bg-black/60 items-center justify-center"
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>

          {/* Image Container */}
          <Pressable
            className="flex-1 items-center justify-center"
            onPress={() => setFullScreenImage(null)}
          >
            {fullScreenImage && (
              <ExpoImage
                source={{ uri: fullScreenImage }}
                style={{
                  width: Dimensions.get("window").width,
                  height: Dimensions.get("window").height,
                }}
                contentFit="contain"
                transition={200}
                cachePolicy="memory-disk"
              />
            )}
          </Pressable>
        </View>
      </Modal>

      {/* Options Modal (Unmatch/Block) */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center"
          onPress={() => setShowOptionsModal(false)}
        >
          <Pressable
            className="bg-white rounded-2xl p-6 w-[85%] border border-[#EDE5D5]"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-[#1C1208] text-xl font-semibold mb-6 text-center">
              Chat Options
            </Text>

            {/* Unmatch Option */}
            <Pressable
              onPress={async () => {
                setShowOptionsModal(false);
                Alert.alert(
                  "Unmatch",
                  `Are you sure you want to unmatch with ${fullName}? This will delete your match and chat history.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Unmatch",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          const { error } = await supabase.functions.invoke(
                            "unmatch",
                            {
                              body: { matchId: chatId },
                            }
                          );

                          if (error) {
                            Alert.alert(
                              "Error",
                              "Failed to unmatch. Please try again."
                            );
                            return;
                          }

                          // Navigate back to chat list
                          queryClient.invalidateQueries({
                            queryKey: ["chat-list"],
                          });
                          router.replace("/(main)/chat");
                        } catch (error) {
                          console.error("Error unmatching:", error);
                          Alert.alert(
                            "Error",
                            "Failed to unmatch. Please try again."
                          );
                        }
                      },
                    },
                  ]
                );
              }}
              className="py-4 border-b border-[#EDE5D5]"
            >
              <Text className="text-[#1C1208] text-base">Unmatch</Text>
              <Text className="text-[#9E8E7E] text-sm mt-1">
                Remove this match and chat history
              </Text>
            </Pressable>

            {/* Block Option */}
            <Pressable
              onPress={() => {
                setShowOptionsModal(false);
                if (otherUser?.id) {
                  router.push({
                    pathname: "/(main)/chat/report-block",
                    params: {
                      userId: otherUser.id,
                      userName: fullName,
                      matchId: chatId,
                    },
                  });
                }
              }}
              className="py-4"
            >
              <Text className="text-red-500 text-base">Report & Block</Text>
              <Text className="text-[#9E8E7E] text-sm mt-1">
                Report this user and block them
              </Text>
            </Pressable>

            {/* Cancel Button */}
            <Pressable
              onPress={() => setShowOptionsModal(false)}
              className="mt-4 pt-4 border-t border-[#EDE5D5]"
            >
              <Text className="text-[#6B5D4F] text-center text-base">
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

    </KeyboardAvoidingView>
  );
}
