import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
): "locked" | "not_started" | "completed" {
  if (moduleNumber > 1) {
    const prev = modules.find((m) => m.module_number === moduleNumber - 1);
    if (prev) {
      const prevProgress = progress.find((p) => p.module_id === prev.id);
      if (!prevProgress?.module_completed) return "locked";
    }
  }
  const current = modules.find((m) => m.module_number === moduleNumber);
  if (!current) return "not_started";
  const currentProgress = progress.find((p) => p.module_id === current.id);
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

  const completedCount = useMemo(
    () => progress?.filter((p) => p.module_completed).length || 0,
    [progress]
  );
  const totalCount = modules?.length || 0;
  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const nextModule = useMemo(() => {
    if (!modules || !progress) return null;
    return modules.find((module) => {
      const mp = progress.find((p) => p.module_id === module.id);
      return !mp?.module_completed;
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
    <View style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: "#EDE5D5",
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color="#1C1208" />
        </Pressable>
        <Text style={{ color: "#1C1208", fontSize: 17, fontWeight: "700" }}>
          Marriage Foundations
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 130 }}
      >
        {/* Hero Banner */}
        <View
          style={{
            margin: 16,
            borderRadius: 24,
            overflow: "hidden",
            shadowColor: "#3D2000",
            shadowOpacity: 0.3,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
            elevation: 12,
          }}
        >
          <LinearGradient
            colors={["#2A1505", "#5C3010", "#9E6A08", "#B8860B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 24 }}
          >
            {/* Decorative rings */}
            <View
              style={{
                position: "absolute", top: -30, right: -30,
                width: 130, height: 130, borderRadius: 65,
                borderWidth: 1, borderColor: "rgba(255,220,100,0.1)",
              }}
            />
            <View
              style={{
                position: "absolute", top: -10, right: -10,
                width: 90, height: 90, borderRadius: 45,
                borderWidth: 1, borderColor: "rgba(255,220,100,0.07)",
              }}
            />

            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View
                style={{
                  width: 52, height: 52, borderRadius: 26,
                  backgroundColor: "rgba(255,220,100,0.14)",
                  alignItems: "center", justifyContent: "center",
                  borderWidth: 1, borderColor: "rgba(255,220,100,0.22)",
                  marginRight: 14,
                }}
              >
                <Ionicons name="ribbon" size={28} color="#FFD060" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "rgba(255,220,100,0.7)",
                    fontSize: 10, fontWeight: "700",
                    letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 3,
                  }}
                >
                  IKHTIAR
                </Text>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: -0.3 }}>
                  Marriage Foundations
                </Text>
              </View>
            </View>

            <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, lineHeight: 19, marginBottom: 20 }}>
              Complete all modules to earn your Marriage Foundations certification and badge.
            </Text>

            {/* Progress block */}
            <View
              style={{
                backgroundColor: "rgba(0,0,0,0.22)",
                borderRadius: 14, padding: 14,
                borderWidth: 1, borderColor: "rgba(255,220,100,0.08)",
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                  {completedCount} of {totalCount} modules complete
                </Text>
                <Text style={{ color: "#FFD060", fontSize: 20, fontWeight: "900" }}>
                  {overallProgress}%
                </Text>
              </View>
              <View style={{ height: 8, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 4, overflow: "hidden" }}>
                <LinearGradient
                  colors={["#FFD060", "#E8A020"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: "100%", width: `${overallProgress}%`, borderRadius: 4 }}
                />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Certified banner */}
        {certification?.is_certified && (
          <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
            <LinearGradient
              colors={["rgba(184,134,11,0.12)", "rgba(212,160,23,0.05)"]}
              style={{
                borderRadius: 18, padding: 16,
                flexDirection: "row", alignItems: "center",
                borderWidth: 1, borderColor: "rgba(184,134,11,0.28)",
              }}
            >
              <View
                style={{
                  width: 42, height: 42, borderRadius: 21,
                  backgroundColor: "rgba(184,134,11,0.13)",
                  alignItems: "center", justifyContent: "center", marginRight: 12,
                }}
              >
                <Ionicons name="ribbon" size={20} color="#B8860B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#B8860B", fontWeight: "800", fontSize: 14, marginBottom: 2 }}>
                  Masha'Allah — Certified!
                </Text>
                <Text style={{ color: "#9E8E7E", fontSize: 12 }}>
                  {certification.certified_at
                    ? new Date(certification.certified_at).toLocaleDateString("en-US", {
                        month: "long", day: "numeric", year: "numeric",
                      })
                    : "Course completed"}
                </Text>
              </View>
              <MarriageFoundationsBadge size="medium" />
            </LinearGradient>
          </View>
        )}

        {/* Module list */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text
            style={{
              color: "#9E8E7E", fontSize: 10, fontWeight: "700",
              letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 14,
            }}
          >
            Modules
          </Text>

          {modules?.map((module) => {
            const status = getModuleStatus(module.module_number, modules, progress || []);
            const isLocked = status === "locked";
            const isCompleted = status === "completed";
            const isActive = !isLocked && !isCompleted;

            return (
              <Pressable
                key={module.id}
                onPress={() => {
                  if (!isLocked)
                    router.push(`/(main)/profile/marriage-foundations/${module.id}`);
                }}
                disabled={isLocked}
                style={({ pressed }) => ({
                  marginBottom: 10,
                  opacity: isLocked ? 0.55 : pressed ? 0.9 : 1,
                  transform: [{ scale: pressed && !isLocked ? 0.985 : 1 }],
                })}
              >
                <View
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 18,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1.5,
                    borderColor: isCompleted ? "rgba(184,134,11,0.35)" : "#EDE5D5",
                    shadowColor: isCompleted ? "#B8860B" : "#1C1208",
                    shadowOpacity: isCompleted ? 0.1 : 0.04,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: isCompleted ? 3 : 1,
                  }}
                >
                  {/* Number / status circle */}
                  <View style={{ marginRight: 14 }}>
                    {isCompleted ? (
                      <LinearGradient
                        colors={["#D4A017", "#B8860B"]}
                        style={{
                          width: 46, height: 46, borderRadius: 23,
                          alignItems: "center", justifyContent: "center",
                          shadowColor: "#B8860B", shadowOpacity: 0.35,
                          shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
                        }}
                      >
                        <Ionicons name="checkmark" size={24} color="#fff" />
                      </LinearGradient>
                    ) : (
                      <View
                        style={{
                          width: 46, height: 46, borderRadius: 23,
                          alignItems: "center", justifyContent: "center",
                          backgroundColor: isLocked ? "#F5F0E8" : "rgba(184,134,11,0.08)",
                          borderWidth: isActive ? 2 : 1,
                          borderColor: isActive ? "#B8860B" : "#DDD5C5",
                        }}
                      >
                        {isLocked ? (
                          <Ionicons name="lock-closed" size={18} color="#C5B89A" />
                        ) : (
                          <Text style={{ color: "#B8860B", fontWeight: "900", fontSize: 17 }}>
                            {module.module_number}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: isLocked ? "#9E8E7E" : "#1C1208",
                        fontWeight: "700", fontSize: 14,
                        marginBottom: 3, lineHeight: 20,
                      }}
                    >
                      {module.title}
                    </Text>
                    <Text
                      style={{ color: "#9E8E7E", fontSize: 12, lineHeight: 17 }}
                      numberOfLines={2}
                    >
                      {module.description}
                    </Text>

                    {isCompleted && (
                      <View style={{ flexDirection: "row", marginTop: 7 }}>
                        <View
                          style={{
                            backgroundColor: "rgba(184,134,11,0.12)",
                            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
                          }}
                        >
                          <Text style={{ color: "#B8860B", fontSize: 10, fontWeight: "700", letterSpacing: 0.4 }}>
                            ✓ COMPLETED
                          </Text>
                        </View>
                      </View>
                    )}
                    {isLocked && (
                      <Text style={{ color: "#C5B89A", fontSize: 11, marginTop: 4 }}>
                        Complete previous module to unlock
                      </Text>
                    )}
                  </View>

                  {!isLocked && (
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={isCompleted ? "#C9980A" : "#C5B89A"}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating CTA */}
      {nextModule && (
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 90,
            left: 16, right: 16,
            shadowColor: "#B8860B",
            shadowOpacity: 0.55,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 8 },
            elevation: 14,
          }}
        >
          <Pressable
            onPress={() =>
              router.push(`/(main)/profile/marriage-foundations/${nextModule.id}`)
            }
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.97 : 1 }],
              borderRadius: 999,
            })}
          >
            <LinearGradient
              colors={["#E8B820", "#C9980A", "#A87A08"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 18, borderRadius: 999,
                alignItems: "center",
                borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 }}>
                {overallProgress === 0
                  ? "Begin Course"
                  : `Continue — Module ${nextModule.module_number}`}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}
