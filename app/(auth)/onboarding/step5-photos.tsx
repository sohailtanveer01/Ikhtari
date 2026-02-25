import { View, Text, Pressable, ScrollView, Alert, LayoutChangeEvent, Platform, KeyboardAvoidingView, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../lib/supabase";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import DraggablePhoto from "@/components/DraggablePhoto";
import { Ionicons } from "@expo/vector-icons";
import OnboardingBackground from "@/components/OnboardingBackground";

async function uploadPhoto(uri: string, userId: string) {
  const ext = uri.split(".").pop() || "jpg";
  const filePath = `${userId}/${Date.now()}.${ext}`;

  // React Native: Read file as base64 and convert to ArrayBuffer
  const response = await fetch(uri);
  const blob = await response.arrayBuffer();
  
  const { error } = await supabase.storage
    .from("profile-photos")
    .upload(filePath, blob, {
      contentType: `image/${ext}`,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("profile-photos")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

const TOTAL_STEPS = 5;
const CURRENT_STEP = 2;

export default function Step5Photos() {
  const router = useRouter();
  const { data, setData } = useOnboarding();
  const [uploading, setUploading] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverTargetIndex, setHoverTargetIndex] = useState<number | null>(null);
  const [layoutPositions, setLayoutPositions] = useState<{ [key: number]: { x: number; y: number; width: number; height: number } }>({});
  const [hasShownWarning, setHasShownWarning] = useState(false);

  const pickImage = async (index: number) => {
    // Show content policy alert only on first photo upload
    if (!hasShownWarning) {
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
            onPress: () => {
              setHasShownWarning(true);
              proceedWithImagePick(index);
            },
          },
        ]
      );
    } else {
      // If warning already shown, proceed directly
      proceedWithImagePick(index);
    }
  };

  const proceedWithImagePick = async (index: number) => {
    try {
      // Check & request permission
      const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
      let hasPermission = existingStatus === 'granted';
      
      if (!hasPermission) {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        hasPermission = status === 'granted';
      }

      if (!hasPermission) {
        Alert.alert(
          "Permission needed",
          "We need access to your gallery to add photos. Please enable photo permissions in your device settings."
        );
        return;
      }

      // Open gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        // No crop/adjust on upload (select as-is)
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedUri = result.assets[0].uri;

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // User is authenticated - upload immediately
        setUploading(true);
        const url = await uploadPhoto(selectedUri, user.id);
        
        // Update photos array at specific index
        const newPhotos = [...data.photos];
        newPhotos[index] = url;
        setData((d) => ({ ...d, photos: newPhotos }));
      } else {
        // User not authenticated yet - store local URI temporarily
        const newPhotos = [...data.photos];
        newPhotos[index] = selectedUri;
        setData((d) => ({ ...d, photos: newPhotos }));
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to pick/upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (slotIndex: number) => {
    const photo = photosArray[slotIndex];
    if (!photo || photo.trim() === "") return;

    // Remove by slot position (stable even if there are duplicate URLs)
    const filledPhotos = data.photos.filter((p) => p && p.trim() !== "");
    let filledIndex = 0;
    for (let i = 0; i < slotIndex; i++) {
      if (photosArray[i] && photosArray[i].trim() !== "") filledIndex++;
    }

    if (filledIndex >= 0 && filledIndex < filledPhotos.length) {
      filledPhotos.splice(filledIndex, 1);
      setData((d) => ({ ...d, photos: filledPhotos }));
    }
  };

  // Ensure photos array has 6 slots for display
  const photosArray = [...data.photos];
  while (photosArray.length < 6) {
    photosArray.push("");
  }

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex === null) return;
    
    const filledPhotos = data.photos.filter((p) => p && p.trim() !== "");
    const fromPhoto = photosArray[fromIndex];
    
    if (!fromPhoto || fromPhoto.trim() === "") return;
    
    const fromFilledIndex = filledPhotos.indexOf(fromPhoto);
    if (fromFilledIndex === -1) return;
    
    // Calculate target position in filled photos array
    // Count how many filled photos are before the target slot
    let targetFilledIndex = 0;
    for (let i = 0; i < toIndex && i < photosArray.length; i++) {
      if (photosArray[i] && photosArray[i].trim() !== "") {
        targetFilledIndex++;
      }
    }
    
    // If dragging forward, adjust target index (we're removing one item before it)
    if (fromFilledIndex < targetFilledIndex) {
      targetFilledIndex--;
    }
    
    // Remove from current position and insert at new position
    const newFilledPhotos = [...filledPhotos];
    newFilledPhotos.splice(fromFilledIndex, 1);
    newFilledPhotos.splice(targetFilledIndex, 0, fromPhoto);
    
    setData((d) => ({ ...d, photos: newFilledPhotos }));
  };

  const onLayout = (index: number, event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setLayoutPositions((prev) => ({
      ...prev,
      [index]: { x, y, width, height },
    }));
  };

  const next = () => {
    const filledPhotos = data.photos.filter((p) => p && p.trim() !== "");
    if (filledPhotos.length < 3) {
      Alert.alert("More Photos Needed", "Please upload at least 3 photos to continue (including a main photo).");
      return;
    }
    // Filter out empty slots before saving
    setData((d) => ({ ...d, photos: filledPhotos }));
    router.push("/onboarding/step6-location");
  };

  return (
    <OnboardingBackground>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      {/* Sticky top bar (Back + progress + step count) */}
      <View className="pt-20 px-6 pb-4">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full border border-[#B8860B] items-center justify-center"
          >
            <Ionicons name="chevron-back" size={20} color="#1C1208" />
          </Pressable>

          <View className="flex-row items-center gap-2 flex-1 justify-center px-4">
            {Array.from({ length: 5 }, (_, i) => i + 1).map((indicator) => {
              const getIndicatorForStep = (step: number) => {
                if (step <= 5) return step;
                return 5;
              };
              const activeIndicator = getIndicatorForStep(CURRENT_STEP);
              const isActive = indicator === activeIndicator;
              return (
                <View
                  key={indicator}
                  className={`h-1 rounded-full ${
                    isActive ? "bg-[#F5F573] w-8" : "bg-[#B8860B] w-6"
                  }`}
                />
              );
            })}
          </View>

          <Text className="text-[#B8860B] text-xs font-medium" style={{ width: 50, textAlign: "right" }}>
            step {CURRENT_STEP}/{TOTAL_STEPS}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={true}
      >
      <View className="px-6 pt-2 pb-10">
        {/* Header Section */}
        <View className="mb-10">
          <Text className="text-[#1C1208] text-4xl font-bold mb-3 leading-tight">
            Your Photos
          </Text>
          <Text className="text-[#6B5D4F] text-xl font-medium mb-2">
            Add up to 6 photos
          </Text>
          <Text className="text-[#6B5D4F] text-sm">
            The first photo will be your main profile picture
          </Text>
        </View>

        {/* Photo Grid */}
        <View className="mb-10">
          
          <View className="flex-row flex-wrap gap-4 justify-between">
            {photosArray.slice(0, 6).map((photo, index) => {
              const isDragging = draggingIndex === index;
              const filledPhotos = data.photos.filter((p) => p && p.trim() !== "");
              const isMainPhoto = photo && filledPhotos.indexOf(photo) === 0;
              
              return (
                <DraggablePhoto
                  key={index}
                  photo={photo}
                  index={index}
                  isMainPhoto={isMainPhoto}
                  isDragging={isDragging}
                  onLayout={(e) => onLayout(index, e)}
                  // Bigger tiles on onboarding Step 5 (2 columns instead of 3)
                  containerClassName="w-[48%]"
                  onLongPress={() => {
                    if (photo && photo.trim() !== "") {
                      setDraggingIndex(index);
                    }
                  }}
                  onDragUpdate={(targetIndex) => {
                    setHoverTargetIndex(targetIndex);
                  }}
                  onDragEnd={(targetIndex) => {
                    setDraggingIndex(null);
                    setHoverTargetIndex(null);
                    if (targetIndex !== null && targetIndex !== index) {
                      handleReorder(index, targetIndex);
                    }
                  }}
                  hoverTargetIndex={hoverTargetIndex}
                  draggingIndex={draggingIndex}
                  onPress={() => {
                    if (!photo || photo.trim() === "") {
                      pickImage(index);
                    }
                  }}
                  onRemove={() => removePhoto(index)}
                  uploading={uploading}
                  layoutPositions={layoutPositions}
                />
              );
            })}
          </View>
        </View>
      </View>
      </ScrollView>

      {/* Fixed Next Button */}
      <View className="px-6 pb-8 pt-4">
        <Pressable
          className="bg-[#B8860B] p-5 rounded-2xl items-center shadow-lg"
          onPress={next}
          disabled={uploading}
          style={{
            shadowColor: "#B8860B",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold">Next</Text>
          )}
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </OnboardingBackground>
  );
}
