import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MarriageFoundationsBadge } from "@/components/MarriageFoundationsBadge";
import { useCertification } from "@/lib/hooks/useCertification";
import {
  useCourseModules,
  useUserProgress,
} from "@/lib/hooks/useMarriageCourse";

function getModuleStatus(
  moduleNumber: number,
  modules: any[],
  progress: any[]
): "locked" | "not_started" | "in_progress" | "completed" {
  // Check if previous module is completed
  if (moduleNumber > 1) {
    const previousModule = modules.find((m) => m.module_number === moduleNumber - 1);
    if (previousModule) {
      const previousProgress = progress.find((p) => p.module_id === previousModule.id);
      if (!previousProgress?.module_completed) {
        return "locked";
      }
    }
  }

  // Check current module progress
  const currentModule = modules.find((m) => m.module_number === moduleNumber);
  if (!currentModule) return "not_started";

  const currentProgress = progress.find((p) => p.module_id === currentModule.id);

  if (currentProgress?.module_completed) return "completed";
  return "not_started";
}

export default function MarriageFoundationsCourseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: modules, isLoading: modulesLoading } = useCourseModules();
  const { data: progress, isLoading: progressLoading } = useUserProgress();
  const { data: certification } = useCertification();

  const isLoading = modulesLoading || progressLoading;

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (!modules || !progress) return 0;
    const totalModules = modules.length;
    const completedModules = progress.filter((p) => p.module_completed).length;
    return totalModules > 0
      ? Math.round((completedModules / totalModules) * 100)
      : 0;
  }, [modules, progress]);

  // Get next module to continue
  const nextModule = useMemo(() => {
    if (!modules || !progress) return null;
    return modules.find((module) => {
      const moduleProgress = progress.find((p) => p.module_id === module.id);
      return !moduleProgress?.module_completed;
    });
  }, [modules, progress]);

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}
        className="items-center justify-center"
      >
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}
      className="flex-1"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-[#EDE5D5]">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1C1208" />
        </Pressable>
        <Text className="text-[#1C1208] text-lg font-semibold">
          Marriage Foundations
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Progress Section */}
        <View className="px-4 py-6">
          <View className="bg-white rounded-2xl p-6 mb-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[#1C1208] text-xl font-bold">
                Course Progress
              </Text>
              {certification?.is_certified && (
                <MarriageFoundationsBadge size="medium" />
              )}
            </View>

            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[#6B5D4F] text-sm">
                  {overallProgress}% Complete
                </Text>
                <Text className="text-[#6B5D4F] text-sm">
                  {progress?.filter((p) => p.module_completed).length || 0} /{" "}
                  {modules?.length || 0} Modules
                </Text>
              </View>
              <View className="h-3 bg-[#EDE5D5] rounded-full overflow-hidden">
                <View
                  className="h-full bg-[#B8860B] rounded-full"
                  style={{ width: `${overallProgress}%` }}
                />
              </View>
            </View>

            {certification?.is_certified && certification?.certified_at && (
              <Text className="text-[#B8860B] text-xs">
                Certified on{" "}
                {new Date(certification.certified_at).toLocaleDateString()}
              </Text>
            )}
          </View>

          {/* Start/Continue Button */}
          {nextModule && (
            <Pressable
              onPress={() =>
                router.push(
                  `/(main)/profile/marriage-foundations/${nextModule.id}`
                )
              }
              className="bg-[#B8860B] rounded-xl py-4 px-6 mb-6"
            >
              <Text className="text-black text-center font-bold text-base">
                {overallProgress === 0
                  ? "Start Course"
                  : `Continue Course`}
              </Text>
            </Pressable>
          )}

          {certification?.is_certified && !nextModule && (
            <View className="bg-[#B8860B]/20 border border-[#B8860B]/50 rounded-xl py-4 px-6 mb-6">
              <Text className="text-[#B8860B] text-center font-semibold text-base">
                ✓ Course Completed
              </Text>
            </View>
          )}
        </View>

        {/* Modules List */}
        <View className="px-4 pb-6">
          <Text className="text-[#1C1208] text-lg font-semibold mb-4">
            Course Modules
          </Text>

          {modules?.map((module) => {
            const moduleProgress = progress?.find(
              (p) => p.module_id === module.id
            );
            const status = getModuleStatus(
              module.module_number,
              modules,
              progress || []
            );

            const getStatusIcon = () => {
              switch (status) {
                case "locked":
                  return { name: "lock-closed", color: "#9CA3AF" };
                case "not_started":
                  return { name: "play-circle-outline", color: "#1C1208" };
                case "in_progress":
                  return { name: "pause-circle-outline", color: "#B8860B" };
                case "completed":
                  return { name: "checkmark-circle", color: "#B8860B" };
              }
            };

            const statusIcon = getStatusIcon();
            const isLocked = status === "locked";

            return (
              <Pressable
                key={module.id}
                onPress={() => {
                  if (!isLocked) {
                    router.push(
                      `/(main)/profile/marriage-foundations/${module.id}`
                    );
                  }
                }}
                disabled={isLocked}
                className={`bg-white rounded-xl p-4 mb-3 border border-[#EDE5D5] ${
                  isLocked ? "opacity-50" : ""
                }`}
              >
                <View className="flex-row items-start">
                  <View className="w-10 h-10 rounded-full bg-[#F5F0E8] items-center justify-center mr-3">
                    <Ionicons
                      name={statusIcon.name}
                      size={24}
                      color={statusIcon.color}
                    />
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-[#1C1208] font-semibold text-base">
                        Module {module.module_number}: {module.title}
                      </Text>
                    </View>
                    <Text className="text-[#6B5D4F] text-sm mb-2">
                      {module.description}
                    </Text>

                    {status === "in_progress" && (
                      <Text className="text-[#B8860B] text-xs mt-2">
                        In Progress
                      </Text>
                    )}

                    {status === "completed" && (
                      <Text className="text-[#B8860B] text-xs mt-2">
                        ✓ Completed
                      </Text>
                    )}

                    {isLocked && (
                      <Text className="text-[#9E8E7E] text-xs mt-2">
                        Complete previous module to unlock
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

      </ScrollView>
    </View>
  );
}

