import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, FlatList, LayoutChangeEvent, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUserStore } from "../../../lib/stores/userStore";
import { supabase } from "../../../lib/supabase";
import { MarriageFoundationsBadge } from "../../../components/MarriageFoundationsBadge";
import { useCertification } from "../../../lib/hooks/useCertification";

async function uploadPhoto(uri: string, userId: string) {
  const ext = uri.split(".").pop() || "jpg";
  const filePath = `${userId}/${Date.now()}.${ext}`;

  const response = await fetch(uri);
  const blob = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from("profile-photos")
    .upload(filePath, blob, { contentType: `image/${ext}` });

  if (error) throw error;

  const { data } = supabase.storage
    .from("profile-photos")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

function calculateProfileCompletion(profile: any, prompts: any[] = []): number {
  if (!profile) return 0;

  // Mandatory fields (excluded from calculation):
  // - first_name, last_name (basic info)
  // - 1 main photo (photos.length >= 1)

  // Calculate completion for each optional category

  // 1. Photos: 1 is mandatory, 5 are optional (max 6 total)
  // Completion = (number of photos - 1) / 5 * 100
  const photoCount = profile.photos?.length || 0;
  const photoCompletion = photoCount >= 1
    ? Math.min(100, Math.round(((photoCount - 1) / 5) * 100))
    : 0;

  // 2. Personal Info (height, dob, marital_status, has_children)
  let personalInfoCompleted = 0;
  const personalInfoTotal = 4;
  if (profile.height) personalInfoCompleted++;
  if (profile.dob) personalInfoCompleted++;
  if (profile.marital_status) personalInfoCompleted++;
  if (profile.has_children !== null && profile.has_children !== undefined) personalInfoCompleted++;
  const personalInfoCompletion = Math.round((personalInfoCompleted / personalInfoTotal) * 100);

  // 3. Religious Info (sect, born_muslim, religious_practice, alcohol_habit, smoking_habit)
  let religiousInfoCompleted = 0;
  const religiousInfoTotal = 5;
  if (profile.sect) religiousInfoCompleted++;
  if (profile.born_muslim !== null && profile.born_muslim !== undefined) religiousInfoCompleted++;
  if (profile.religious_practice) religiousInfoCompleted++;
  if (profile.alcohol_habit) religiousInfoCompleted++;
  if (profile.smoking_habit) religiousInfoCompleted++;
  const religiousInfoCompletion = Math.round((religiousInfoCompleted / religiousInfoTotal) * 100);

  // 4. Professional Info (education, profession)
  let professionalInfoCompleted = 0;
  const professionalInfoTotal = 2;
  if (profile.education) professionalInfoCompleted++;
  if (profile.profession) professionalInfoCompleted++;
  const professionalInfoCompletion = Math.round((professionalInfoCompleted / professionalInfoTotal) * 100);

  // 5. Background Info (ethnicity, nationality)
  let backgroundInfoCompleted = 0;
  const backgroundInfoTotal = 2;
  if (profile.ethnicity) backgroundInfoCompleted++;
  if (profile.nationality) backgroundInfoCompleted++;
  const backgroundInfoCompletion = Math.round((backgroundInfoCompleted / backgroundInfoTotal) * 100);

  // 6. Bio
  const bioCompletion = profile.bio ? 100 : 0;

  // 7. Hobbies (at least 1 hobby = 100%)
  const hobbiesCompletion = (profile.hobbies && profile.hobbies.length > 0) ? 100 : 0;

  // 8. Prompts (count prompts with both question and answer filled)
  // Typically users can have up to 3 prompts, so completion = (filled prompts / 3) * 100
  const filledPrompts = prompts.filter((p: any) => p.question && p.answer).length;
  const promptsTotal = 3; // Maximum 3 prompts
  const promptsCompletion = Math.min(100, Math.round((filledPrompts / promptsTotal) * 100));

  // Calculate weighted average (each category contributes equally)
  const categories = [
    photoCompletion,
    personalInfoCompletion,
    religiousInfoCompletion,
    professionalInfoCompletion,
    backgroundInfoCompletion,
    bioCompletion,
    hobbiesCompletion,
    promptsCompletion,
  ];

  const totalCompletion = categories.reduce((sum, completion) => sum + completion, 0);
  const averageCompletion = Math.round(totalCompletion / categories.length);

  return averageCompletion;
}

// Draggable Photo Card Component
interface DraggablePhotoCardProps {
  photo: string;
  index: number;
  isMainPhoto: boolean;
  isDragging: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
  onPress: () => void;
  onLongPress: () => void;
  onDragUpdate?: (targetIndex: number | null) => void;
  onDragEnd: (targetIndex: number | null) => void;
  onRemove: () => void;
  hoverTargetIndex: number | null;
  draggingIndex: number | null;
  layoutPositions: { [key: number]: { x: number; y: number; width: number; height: number } };
  layoutVersion: number;
  maxPhotos: number;
}

function DraggablePhotoCard({
  photo,
  index,
  isMainPhoto,
  isDragging,
  onLayout,
  onPress,
  onLongPress,
  onDragUpdate,
  onDragEnd,
  onRemove,
  hoverTargetIndex,
  draggingIndex,
  layoutPositions,
  layoutVersion,
  maxPhotos,
}: DraggablePhotoCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const shiftX = useSharedValue(0);
  const shiftY = useSharedValue(0);
  const isPressed = useSharedValue(false);

  const findTargetIndex = (x: number, y: number): number | null => {
    "worklet";
    let closestIndex: number | null = null;
    let minDistance = Infinity;

    for (let i = 0; i < maxPhotos; i++) {
      const pos = layoutPositions[i];
      if (pos) {
        const centerX = pos.x + pos.width / 2;
        const centerY = pos.y + pos.height / 2;
        const distance = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );
        if (distance < Math.max(pos.width, pos.height) / 2 && distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }
    }
    return closestIndex;
  };

  // Calculate shift for non-dragging items when hoverTargetIndex changes
  useEffect(() => {
    if (draggingIndex !== null && draggingIndex !== index && hoverTargetIndex !== null && hoverTargetIndex !== draggingIndex) {
      const currentPos = layoutPositions[index];
      if (!currentPos) {
        shiftX.value = withSpring(0);
        shiftY.value = withSpring(0);
        return;
      }

      if (draggingIndex < hoverTargetIndex) {
        if (index > draggingIndex && index <= hoverTargetIndex) {
          const prevIndex = index - 1;
          const prevPos = layoutPositions[prevIndex];
          if (prevPos) {
            shiftX.value = withSpring(prevPos.x - currentPos.x);
            shiftY.value = withSpring(prevPos.y - currentPos.y);
          } else {
            shiftX.value = withSpring(0);
            shiftY.value = withSpring(0);
          }
        } else {
          shiftX.value = withSpring(0);
          shiftY.value = withSpring(0);
        }
      } else if (draggingIndex > hoverTargetIndex) {
        if (index >= hoverTargetIndex && index < draggingIndex) {
          const nextIndex = index + 1;
          const nextPos = layoutPositions[nextIndex];
          if (nextPos) {
            shiftX.value = withSpring(nextPos.x - currentPos.x);
            shiftY.value = withSpring(nextPos.y - currentPos.y);
          } else {
            shiftX.value = withSpring(0);
            shiftY.value = withSpring(0);
          }
        } else {
          shiftX.value = withSpring(0);
          shiftY.value = withSpring(0);
        }
      } else {
        shiftX.value = withSpring(0);
        shiftY.value = withSpring(0);
      }
    } else {
      shiftX.value = withSpring(0);
      shiftY.value = withSpring(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverTargetIndex, draggingIndex, index, layoutVersion, layoutPositions]);

  // Long press gesture to activate dragging
  const longPressGesture = Gesture.LongPress()
    .minDuration(250)
    .onStart(() => {
      "worklet";
      isPressed.value = true;
      scale.value = withSpring(1.08);
      opacity.value = withSpring(0.85);
      runOnJS(onLongPress)();
    })
    .onEnd(() => {
      "worklet";
      // Don't reset here - let pan gesture handle the end
    });

  // Pan gesture for dragging
  const panGesture = Gesture.Pan()
    .activateAfterLongPress(250)
    .onStart(() => {
      "worklet";
      // Visual feedback already applied by long press
    })
    .onUpdate((e) => {
      "worklet";
      translateX.value = e.translationX;
      translateY.value = e.translationY;

      const currentPos = layoutPositions[index];
      if (currentPos && onDragUpdate) {
        const targetX = currentPos.x + currentPos.width / 2 + e.translationX;
        const targetY = currentPos.y + currentPos.height / 2 + e.translationY;
        const targetIndex = findTargetIndex(targetX, targetY);
        runOnJS(onDragUpdate)(targetIndex);
      }
    })
    .onEnd((e) => {
      "worklet";
      const currentPos = layoutPositions[index];
      let targetIndex: number | null = null;

      if (currentPos) {
        const targetX = currentPos.x + currentPos.width / 2 + e.translationX;
        const targetY = currentPos.y + currentPos.height / 2 + e.translationY;
        targetIndex = findTargetIndex(targetX, targetY);
      }

      runOnJS(onDragEnd)(targetIndex);

      // Reset animations
      isPressed.value = false;
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
    })
    .onFinalize(() => {
      "worklet";
      // Reset if gesture was cancelled
      if (isPressed.value) {
        isPressed.value = false;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
        opacity.value = withSpring(1);
        runOnJS(onDragEnd)(null);
      }
    });

  // Tap gesture — opens lightbox; loses to long press automatically via Exclusive
  const tapGesture = Gesture.Tap()
    .maxDuration(200)
    .onEnd(() => {
      "worklet";
      runOnJS(onPress)();
    });

  // Exclusive: tap wins on quick touch; long press + pan win on hold
  const composedGesture = Gesture.Exclusive(
    tapGesture,
    Gesture.Simultaneous(longPressGesture, panGesture)
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value + shiftX.value },
        { translateY: translateY.value + shiftY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
      zIndex: isPressed.value ? 1000 : 1,
    };
  });

  const isHoverTarget = hoverTargetIndex === index && draggingIndex !== null && draggingIndex !== index;

  return (
    <View
      className="w-[48%]"
      style={{ aspectRatio: 0.8 }}
      onLayout={onLayout}
    >
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={animatedStyle} className="w-full h-full relative">
          <Image
            source={{ uri: photo }}
            style={{ width: '100%', height: '100%', borderRadius: 24 }}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            priority={isMainPhoto ? "high" : "normal"}
          />
          {isMainPhoto && (
            <View className="absolute top-3 left-3 bg-[#B8860B] px-2 py-1 rounded-full">
              <Text className="text-white text-xs font-bold">Main</Text>
            </View>
          )}
          {isDragging && (
            <View className="absolute inset-0 bg-[#B8860B]/20 border-2 border-[#B8860B] rounded-3xl" />
          )}
          {isHoverTarget && (
            <View className="absolute inset-0 bg-[#B8860B]/10 border-2 border-dashed border-[#B8860B] rounded-3xl" />
          )}
          <Pressable
            onPress={onRemove}
            className="absolute top-3 right-3 bg-red-500 w-7 h-7 rounded-full items-center justify-center"
          >
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverTargetIndex, setHoverTargetIndex] = useState<number | null>(null);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const layoutPositions = useRef<{ [key: number]: { x: number; y: number; width: number; height: number } }>({});
  const [layoutVersion, setLayoutVersion] = useState(0); // Track layout changes to trigger re-renders
  const [reorderCount, setReorderCount] = useState(0); // Track reorders to force component remount
  const previousPhotosRef = useRef<string>(""); // Track previous photos array to detect reorders
  const { data: certification } = useCertification();

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset state when photos change (after reorder)
  useEffect(() => {
    const photosString = JSON.stringify(photos);
    if (previousPhotosRef.current && previousPhotosRef.current !== photosString) {
      // Reset dragging state after reorder
      setDraggingIndex(null);
      setHoverTargetIndex(null);
      // Clear layout positions so they get recalculated
      layoutPositions.current = {};
      // Increment reorder count to force component remount with fresh gesture state
      setReorderCount(prev => prev + 1);
    }
    previousPhotosRef.current = photosString;
  }, [photos]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      // Fetch prompts from user_prompts table
      const { data: promptsData } = await supabase
        .from("user_prompts")
        .select("question, answer, display_order")
        .eq("user_id", user.id)
        .order("display_order", { ascending: true });

      if (promptsData) {
        setPrompts(promptsData);
      } else {
        setPrompts([]);
      }

      setProfile(data);

      // Handle name
      if (data.first_name && data.last_name) {
        setFirstName(data.first_name);
        setLastName(data.last_name);
      } else if (data.name) {
        const nameParts = data.name.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }

      setPhotos(data.photos || []);
      // Reset layout positions when photos change
      layoutPositions.current = {};
    } catch (e: any) {
      console.error("Error loading profile:", e);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (targetIndex?: number) => {
    // Show content policy alert first
    Alert.alert(
      "Photo Guidelines",
      "Please upload respectful photos only.\n\nWe do not allow nudity, sexually explicit, or inappropriate content.\n\nAccounts found violating this policy may be permanently banned without warning.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "I Understand",
          onPress: () => proceedWithImagePick(targetIndex),
        },
      ]
    );
  };

  const proceedWithImagePick = async (targetIndex?: number) => {
    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      let hasPermission = status === 'granted';

      if (!hasPermission) {
        const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        hasPermission = newStatus === 'granted';
      }

      if (!hasPermission) {
        Alert.alert("Permission needed", "We need access to your gallery to add photos.");
        return;
      }

      const remainingSlots = 6 - photos.length;
      if (remainingSlots <= 0 && targetIndex === undefined) {
        Alert.alert("Limit reached", "You can only upload up to 6 photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUploading(true);
      const url = await uploadPhoto(result.assets[0].uri, user.id);

      if (targetIndex !== undefined) {
        const newPhotos = [...photos];
        newPhotos[targetIndex] = url;
        setPhotos(newPhotos);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const locationPoint = profile?.location &&
            typeof profile.location === 'object' &&
            typeof profile.location.lon === 'number' &&
            typeof profile.location.lat === 'number' &&
            !isNaN(profile.location.lon) &&
            !isNaN(profile.location.lat)
            ? `SRID=4326;POINT(${profile.location.lon} ${profile.location.lat})`
            : null;

          const updatePayload: any = {
            photos: newPhotos,
            last_active_at: new Date().toISOString(),
          };

          if (locationPoint) {
            updatePayload.location = locationPoint;
          }

          const { error: updateError } = await supabase
            .from("users")
            .update(updatePayload)
            .eq("id", user.id);

          if (updateError) {
            Alert.alert("Error", "Failed to save photo. Please try again.");
            // Revert the state change
            setPhotos(photos);
            return;
          }

          // Reload profile to ensure sync
          await loadProfile();
        }
      } else {
        const newPhotosArray = [...photos, url];
        setPhotos(newPhotosArray);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const locationPoint = profile?.location &&
            typeof profile.location === 'object' &&
            typeof profile.location.lon === 'number' &&
            typeof profile.location.lat === 'number' &&
            !isNaN(profile.location.lon) &&
            !isNaN(profile.location.lat)
            ? `SRID=4326;POINT(${profile.location.lon} ${profile.location.lat})`
            : null;

          const updatePayload: any = {
            photos: newPhotosArray,
            last_active_at: new Date().toISOString(),
          };

          if (locationPoint) {
            updatePayload.location = locationPoint;
          }

          const { error: updateError } = await supabase
            .from("users")
            .update(updatePayload)
            .eq("id", user.id);

          if (updateError) {
            Alert.alert("Error", "Failed to save photo. Please try again.");
            // Revert the state change
            setPhotos(photos);
            return;
          }

          // Reload profile to ensure sync
          await loadProfile();
        }
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to upload photos.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (url: string) => {
    if (photos.length <= 1) {
      Alert.alert("Cannot Remove", "You must have at least 1 photo in your profile.");
      return;
    }
    const newPhotos = photos.filter((p) => p !== url);
    setPhotos(newPhotos);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const locationPoint = profile?.location &&
          typeof profile.location === 'object' &&
          typeof profile.location.lon === 'number' &&
          typeof profile.location.lat === 'number' &&
          !isNaN(profile.location.lon) &&
          !isNaN(profile.location.lat)
          ? `SRID=4326;POINT(${profile.location.lon} ${profile.location.lat})`
          : null;

        const updatePayload: any = {
          photos: newPhotos,
          last_active_at: new Date().toISOString(),
        };

        if (locationPoint) {
          updatePayload.location = locationPoint;
        }

        const { error: updateError } = await supabase
          .from("users")
          .update(updatePayload)
          .eq("id", user.id);

        if (updateError) {
          console.error("Error removing photo:", updateError);
          Alert.alert("Error", "Failed to remove photo. Please try again.");
          // Revert the state change
          setPhotos(photos);
          return;
        }

        // Reload profile to ensure sync
        await loadProfile();
      }
    } catch (e: any) {
      console.error("Error removing photo:", e);
      Alert.alert("Error", "Failed to remove photo. Please try again.");
      // Revert the state change
      setPhotos(photos);
    }
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const newPhotos = [...photos];
    const [movedPhoto] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, movedPhoto);

    setPhotos(newPhotos);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const locationPoint = profile?.location &&
          typeof profile.location === 'object' &&
          typeof profile.location.lon === 'number' &&
          typeof profile.location.lat === 'number' &&
          !isNaN(profile.location.lon) &&
          !isNaN(profile.location.lat)
          ? `SRID=4326;POINT(${profile.location.lon} ${profile.location.lat})`
          : null;

        const updatePayload: any = {
          photos: newPhotos,
          last_active_at: new Date().toISOString(),
        };

        if (locationPoint) {
          updatePayload.location = locationPoint;
        }

        const { error: updateError } = await supabase
          .from("users")
          .update(updatePayload)
          .eq("id", user.id);

        if (updateError) {
          console.error("Error reordering photos:", updateError);
          // Revert the state change
          setPhotos(photos);
          return;
        }


        // Update Zustand store to instantly sync tab bar icon (no network latency)
        useUserStore.getState().setMainPhoto(newPhotos[0]);
      }
    } catch (e: any) {
      console.error("Error reordering photos:", e);
      // Revert the state change
      setPhotos(photos);
    }
  };

  const onLayout = (index: number, event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    // Create a new object to avoid mutation issues
    layoutPositions.current = {
      ...layoutPositions.current,
      [index]: { x, y, width, height },
    };
    // Increment version to trigger re-renders
    setLayoutVersion(prev => prev + 1);
  };

  // Create a memoized snapshot of layoutPositions that updates when layoutVersion changes
  // This ensures DraggablePhotoCard components get fresh position data
  // Must be called before any conditional returns to follow Rules of Hooks
  const layoutPositionsSnapshot = useMemo(() => {
    return { ...layoutPositions.current };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutVersion]);

  if (loading) {
    return (
      <View className="flex-1 bg-[#FDFAF5] items-center justify-center">
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  const mainPhoto = photos && photos.length > 0 ? photos[0] : null;
  const completionPercentage = calculateProfileCompletion(profile, prompts);
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : profile?.name || "Profile";

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFAF5" }}>
      {/* Background gradient — warm gold bloom at the top */}
      <LinearGradient
        colors={["#FFF2B8", "#FDF8EE", "#FDFAF5"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.52 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      // Allows scrolling past the last item (and above the tab bar)
      contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
    >
      <View className="px-6 pt-16 pb-8">
        {/* Header with Profile Picture and Settings */}
        <View className="items-center mb-8">
          {/* Header row: wordmark left, settings right */}
          <View className="w-full flex-row justify-between items-center mb-4">
            <Text style={{ fontFamily: "GreatVibes-Regular", fontSize: 42, color: "#1C1208", textShadowColor: "#1C1208", textShadowOffset: { width: 0.4, height: 0.4 }, textShadowRadius: 0.5 }}>
              Ikhtiar
            </Text>
            <Pressable
              onPress={() => router.push("/(main)/profile/settings")}
              className="w-14 h-14 rounded-full border-2 border-[#B8860B] items-center justify-center"
              style={{ backgroundColor: 'rgba(184, 134, 11, 0.1)' }}
            >
              <Ionicons name="settings-outline" size={24} color="#B8860B" />
            </Pressable>
          </View>

          {/* Profile Picture with Gold Circle and Completion Percentage - Centered */}
          <View className="relative mb-4">
            {/* Gold Circle Border */}
            <View className="w-40 h-40 rounded-full border-4 border-[#B8860B] items-center justify-center overflow-hidden">
              {mainPhoto ? (
                <Image
                  source={{ uri: mainPhoto }}
                  style={{ width: 128, height: 128, borderRadius: 64 }}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                  placeholder={{ blurhash: "LKO2?U%2Tw=w]~RBVZRi};RPxuwH" }}
                />
              ) : (
                <View className="w-32 h-32 rounded-full bg-[#F5F0E8] items-center justify-center">
                  <Ionicons name="person" size={48} color="#9CA3AF" />
                </View>
              )}
              {/* Completion Percentage Badge */}
              <View className="absolute -bottom-2 bg-[#B8860B] px-3 py-1 rounded-full border-2 border-[#FDFAF5]">
                <Text className="text-white text-xs font-bold">
                  {completionPercentage}%
                </Text>
              </View>
            </View>
          </View>

          {/* Name with Badge */}
          <View className="flex-row items-center justify-center mb-4">
            <Text className="text-[#1C1208] text-3xl font-bold">
              {fullName}
            </Text>
            {certification?.is_certified && certification?.show_badge && (
              <View className="ml-3">
                <MarriageFoundationsBadge size="small" showText={false} />
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 items-center justify-center">
            <Pressable
              onPress={() => router.push("/(main)/profile/edit")}
              className="px-6 py-2.5 bg-[#B8860B]/10 rounded-full border border-[#B8860B]/30"
            >
              <Text className="text-[#B8860B] text-base font-semibold">Edit Profile</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/(main)/profile/preview")}
              className="px-6 py-2.5 bg-[#B8860B]/10 rounded-full border border-[#B8860B]/30"
            >
              <Text className="text-[#B8860B] text-base font-semibold">Preview Profile</Text>
            </Pressable>
          </View>

          {/* My Subscription */}
          {/* <View className="w-full items-center mt-4">
            <Pressable
              onPress={() => router.push("/(main)/profile/subscription")}
              className="w-full max-w-sm px-6 py-3 rounded-full items-center justify-center"
              style={{
                backgroundColor: "rgba(184, 134, 11, 0.18)",
                borderWidth: 1,
                borderColor: "rgba(184, 134, 11, 0.6)",
              }}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="diamond" size={20} color="#B8860B" />
                <Text
                  className="ml-2 font-semibold"
                  style={{ color: "#B8860B" }}
                >
                  My Subscription
                </Text>
              </View>
            </Pressable>
          </View> */}
        </View>

        {/* Marriage Foundations Course Section */}
        <View className="items-center mb-6">
          <Pressable
            onPress={() => router.push("/(main)/profile/marriage-foundations")}
            className="px-6 py-2.5 bg-[#B8860B]/10 rounded-full border border-[#B8860B]/30"
          >
            <Text className="text-[#B8860B] text-base font-semibold">Marriage Foundation</Text>
          </Pressable>
        </View>

        {/* Photos Section */}
        <View className="mb-6">
          {/* Section Title */}
          {/* <Text className="text-white text-xl font-bold mb-4">My Photos</Text> */}

          {/* 2x2 Grid Layout */}
          <View className="flex-row flex-wrap gap-4">
            {/* New Photo Card - Always show if less than 6 photos */}
            {photos.length < 6 && (
              <View
                className="w-[48%]"
                style={{ aspectRatio: 0.8 }}
                onLayout={(e) => {
                  // Track layout for "New Photo" card at index -1 (or photos.length)
                  const newPhotoIndex = photos.length;
                  const { x, y, width, height } = e.nativeEvent.layout;
                  // Create a new object to avoid mutation issues
                  layoutPositions.current = {
                    ...layoutPositions.current,
                    [newPhotoIndex]: { x, y, width, height },
                  };
                }}
              >
                <Pressable
                  onPress={() => {
                    // Find first empty slot
                    const firstEmptyIndex = photos.length;
                    pickImage(firstEmptyIndex);
                  }}
                  disabled={uploading}
                  className="w-full h-full"
                >
                  <View
                    className="rounded-3xl items-center justify-center w-full h-full"
                    style={{
                      backgroundColor: '#B8860B', // Gold color
                    }}
                  >
                    {uploading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="camera" size={48} color="#fff" style={{ marginBottom: 8 }} />
                        <Text className="text-white text-base font-semibold">New Photo</Text>
                        <Text className="text-white/80 text-xs mt-1 text-center">
                          {6 - photos.length} slot{6 - photos.length > 1 ? 's' : ''} left
                        </Text>
                      </>
                    )}
                  </View>
                </Pressable>
              </View>
            )}

            {/* Existing Photo Cards */}
            {photos.map((photo, index) => (
              <DraggablePhotoCard
                key={`${index}-${reorderCount}`}
                photo={photo}
                index={index}
                isMainPhoto={index === 0}
                isDragging={draggingIndex === index}
                onLayout={(e) => onLayout(index, e)}
                onPress={() => { setLightboxIndex(index); setLightboxVisible(true); }}
                onLongPress={() => setDraggingIndex(index)}
                onDragUpdate={(targetIndex) => setHoverTargetIndex(targetIndex)}
                onDragEnd={(targetIndex) => {
                  setDraggingIndex(null);
                  setHoverTargetIndex(null);
                  if (targetIndex !== null && targetIndex !== index) {
                    handleReorder(index, targetIndex);
                  }
                }}
                onRemove={() => removePhoto(photo)}
                hoverTargetIndex={hoverTargetIndex}
                draggingIndex={draggingIndex}
                layoutPositions={layoutPositionsSnapshot}
                layoutVersion={layoutVersion}
                maxPhotos={photos.length}
              />
            ))}
          </View>
        </View>
      </View>
    </ScrollView>

    {/* Full-screen photo lightbox */}
    <Modal
      visible={lightboxVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setLightboxVisible(false)}
    >
      <StatusBar hidden />
      <View style={lightboxStyles.backdrop}>
        <FlatList
          data={photos}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={lightboxIndex}
          getItemLayout={(_, i) => ({
            length: Dimensions.get("window").width,
            offset: Dimensions.get("window").width * i,
            index: i,
          })}
          onMomentumScrollEnd={(e) => {
            const newIndex = Math.round(
              e.nativeEvent.contentOffset.x / Dimensions.get("window").width
            );
            setLightboxIndex(newIndex);
          }}
          renderItem={({ item }) => (
            <View style={lightboxStyles.page}>
              <Image
                source={{ uri: item }}
                style={lightboxStyles.fullImage}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </View>
          )}
        />

        {/* Close button */}
        <Pressable
          onPress={() => { setLightboxVisible(false); StatusBar.setHidden(false); }}
          style={lightboxStyles.closeBtn}
          hitSlop={16}
        >
          <View style={lightboxStyles.closeBtnInner}>
            <Ionicons name="close" size={22} color="#fff" />
          </View>
        </Pressable>

        {/* Page counter */}
        <View style={lightboxStyles.counter}>
          <Text style={lightboxStyles.counterText}>
            {lightboxIndex + 1} / {photos.length}
          </Text>
        </View>

        {/* Dot indicators */}
        {photos.length > 1 && (
          <View style={lightboxStyles.dots}>
            {photos.map((_, i) => (
              <View
                key={i}
                style={[
                  lightboxStyles.dot,
                  i === lightboxIndex && lightboxStyles.dotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
    </View>
  );
}

const lightboxStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000",
  },
  page: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    alignItems: "center",
    justifyContent: "center",
  },
  fullImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
  closeBtn: {
    position: "absolute",
    top: 54,
    right: 20,
  },
  closeBtnInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
  },
  counterText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  dots: {
    position: "absolute",
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    pointerEvents: "none",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 20,
  },
});

