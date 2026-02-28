import { View, Text, Pressable, Image, ActivityIndicator, LayoutChangeEvent } from "react-native";
import { useEffect } from "react";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

interface DraggablePhotoProps {
  photo: string;
  index: number;
  isMainPhoto: boolean;
  isDragging: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
  onLongPress: () => void;
  onDragUpdate?: (targetIndex: number | null) => void;
  onDragEnd: (targetIndex: number | null) => void;
  onPress: () => void;
  onRemove: () => void;
  uploading: boolean;
  layoutPositions: { [key: number]: { x: number; y: number; width: number; height: number } };
  hoverTargetIndex: number | null;
  draggingIndex: number | null;
  containerClassName?: string;
}

export default function DraggablePhoto({
  photo,
  index,
  isMainPhoto,
  isDragging,
  onLayout,
  onLongPress,
  onDragUpdate,
  onDragEnd,
  onPress,
  onRemove,
  uploading,
  layoutPositions,
  hoverTargetIndex,
  draggingIndex,
  containerClassName = "w-[30%]",
}: DraggablePhotoProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const shiftX = useSharedValue(0);
  const shiftY = useSharedValue(0);

  const findTargetIndex = (x: number, y: number): number | null => {
    "worklet";
    for (let i = 0; i < 6; i++) {
      const pos = layoutPositions[i];
      if (pos) {
        const centerX = pos.x + pos.width / 2;
        const centerY = pos.y + pos.height / 2;
        const distance = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );
        if (distance < Math.max(pos.width, pos.height) / 2) {
          return i;
        }
      }
    }
    return null;
  };

  useEffect(() => {
    if (isDragging) {
      scale.value = withSpring(1.1);
      opacity.value = withSpring(0.8);
    } else {
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
    }
  }, [isDragging, opacity, scale]);

  const panGesture = Gesture.Pan()
    .enabled(isDragging && !!photo && photo.trim() !== "")
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
      
      // Find current hover target and notify parent
      const currentPos = layoutPositions[index];
      if (currentPos) {
        const targetX = currentPos.x + currentPos.width / 2 + e.translationX;
        const targetY = currentPos.y + currentPos.height / 2 + e.translationY;
        const targetIndex = findTargetIndex(targetX, targetY);
        if (onDragUpdate) {
          runOnJS(onDragUpdate)(targetIndex);
        }
      }
    })
    .onEnd((e) => {
      const currentPos = layoutPositions[index];
      let targetIndex: number | null = null;
      
      if (currentPos) {
        const targetX = currentPos.x + currentPos.width / 2 + e.translationX;
        const targetY = currentPos.y + currentPos.height / 2 + e.translationY;
        targetIndex = findTargetIndex(targetX, targetY);
      }
      
      runOnJS(onDragEnd)(targetIndex);
      
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
      shiftX.value = withSpring(0);
      shiftY.value = withSpring(0);
    });

  // Calculate shift for non-dragging items
  useEffect(() => {
    if (draggingIndex !== null && draggingIndex !== index && hoverTargetIndex !== null && photo && photo.trim() !== "") {
      const currentPos = layoutPositions[index];
      if (!currentPos) {
        shiftX.value = withSpring(0);
        shiftY.value = withSpring(0);
        return;
      }

      // Determine which direction to shift
      if (draggingIndex < hoverTargetIndex) {
        // Dragging forward: items between draggingIndex and hoverTargetIndex shift backward
        if (index > draggingIndex && index <= hoverTargetIndex) {
          // Shift to previous position
          const prevPos = layoutPositions[index - 1];
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
        // Dragging backward: items between hoverTargetIndex and draggingIndex shift forward
        if (index >= hoverTargetIndex && index < draggingIndex) {
          // Shift to next position
          const nextPos = layoutPositions[index + 1];
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
  }, [hoverTargetIndex, draggingIndex, index, layoutPositions, photo, shiftX, shiftY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value + shiftX.value },
        { translateY: translateY.value + shiftY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
      zIndex: isDragging ? 1000 : 1,
    };
  });

  return (
    <View className={containerClassName} onLayout={onLayout}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            disabled={Boolean(uploading || isDragging || (photo && photo.trim() !== ""))}
            className="aspect-square rounded-2xl border-2 border-dashed border-[#B8860B]/30 bg-[#FDFAF5] items-center justify-center overflow-hidden"
          >
            {photo && photo.trim() !== "" ? (
              <View className="w-full h-full relative">
                <Image
                  source={{ uri: photo }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
                {isMainPhoto && (
                  <View className="absolute top-2 left-2 bg-[#B8860B] px-2 py-1 rounded-full">
                    <Text className="text-white text-xs font-bold">Main</Text>
                  </View>
                )}
                {isDragging && (
                  <View className="absolute inset-0 bg-[#B8860B]/20 border-2 border-[#B8860B] rounded-2xl" />
                )}
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="absolute top-2 right-2 bg-red-500 w-6 h-6 rounded-full items-center justify-center"
                >
                  <Text className="text-white text-xs font-bold">×</Text>
                </Pressable>
              </View>
            ) : (
              <View className="items-center gap-1">
                {uploading ? (
                  <ActivityIndicator color="#B8860B" size="small" />
                ) : (
                  <>
                    <Text className="text-[#B8860B] text-3xl font-light">+</Text>
                    <Text className="text-[#9E8E7E] text-xs text-center px-2">
                      {index === 0 ? "Main Photo" : `Photo ${index + 1}`}
                    </Text>
                  </>
                )}
              </View>
            )}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

