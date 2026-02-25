import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DiscoverCard from "../../../components/DiscoverCard";
// @ts-ignore
import Logo from "../../../components/Logo";
import { useCertification } from "../../../lib/hooks/useCertification";
import { useDiscoverStore } from "../../../lib/stores/discoverStore";
import { supabase } from "../../../lib/supabase";

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const profiles = useDiscoverStore((s) => s.profiles);
  const isLoading = useDiscoverStore((s) => s.isLoading);
  const hasMore = useDiscoverStore((s) => s.hasMore);
  const hasMarkedSeen = useDiscoverStore((s) => s.hasMarkedSeen);
  const loadInitial = useDiscoverStore((s) => s.loadInitial);
  const markAsSeen = useDiscoverStore((s) => s.markAsSeen);

  const [showTicks, setShowTicks] = useState(false);
  const [isNewBatch, setIsNewBatch] = useState(false);

  const gridExitAnim = useRef(new Animated.Value(1)).current;

  const {
    data: certification,
    isLoading: certLoading,
    refetch: refetchCert,
  } = useCertification();
  const isCertified = certification?.is_certified === true;

  const [intentQuestionsSet, setIntentQuestionsSet] = useState<
    boolean | null
  >(null);
  const [checkingQuestions, setCheckingQuestions] = useState(true);

  const flatListRef = useRef<FlatList>(null);

  // Check if user has set intent questions
  const checkIntentQuestions = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("intent_questions_set")
        .eq("id", user.id)
        .single();

      setIntentQuestionsSet(profile?.intent_questions_set ?? false);
    } catch (e) {
      console.error("Error checking intent questions:", e);
      setIntentQuestionsSet(false);
    } finally {
      setCheckingQuestions(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkIntentQuestions();
      refetchCert();
    }, [checkIntentQuestions, refetchCert])
  );

  // Always load profiles so they appear blurred in background
  useEffect(() => {
    if (!checkingQuestions) {
      loadInitial();
    }
  }, [checkingQuestions, loadInitial]);

  const handleMarkAsSeen = useCallback(async () => {
    if (isLoading || showTicks || profiles.length === 0) return;

    // Step 1: Green ticks appear on all cards
    setShowTicks(true);
    await new Promise((r) => setTimeout(r, 500));

    // Step 2: Cards scale + fade out together
    await new Promise<void>((resolve) => {
      Animated.timing(gridExitAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start(() => resolve());
    });

    // Step 3: Grid is invisible — load next batch
    setShowTicks(false);
    setIsNewBatch(true);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    await markAsSeen();

    // Step 4: Show grid again — new cards will spring in from DiscoverCard
    gridExitAnim.setValue(1);

    // Step 5: Clear new batch flag after entry animations finish
    setTimeout(() => setIsNewBatch(false), 700);
  }, [isLoading, showTicks, profiles.length, markAsSeen, gridExitAnim]);

  const handleProfilePress = useCallback(
    (profile: any) => {
      if (!isCertified) return;
      router.push(`/(main)/swipe/profile-view?userId=${profile.id}`);
    },
    [router, isCertified]
  );

  // Loading state
  if (checkingQuestions || certLoading) {
    return (
      <View className="flex-1 bg-[#FDFAF5] items-center justify-center">
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  const showCertGate = !isCertified;
  const showIntentGate = isCertified && intentQuestionsSet === false;

  return (
    <View className="flex-1 bg-[#FDFAF5]" style={{ paddingTop: insets.top }}>
      {/* Top Bar */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <Logo variant="transparent" width={160} />
        {isCertified && (
          <Pressable
            className="w-10 h-10 rounded-full bg-[#F5F0E8] items-center justify-center"
            onPress={() => router.push("/(main)/swipe/filters")}
          >
            <Ionicons name="options-outline" size={22} color="#B8860B" />
          </Pressable>
        )}
      </View>

      {/* Profile Grid - always rendered */}
      {isLoading && profiles.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#B8860B" />
        </View>
      ) : profiles.length === 0 && !isLoading && hasMarkedSeen ? (
        /* All compatible profiles seen — come back tomorrow */
        <View className="flex-1 items-center justify-center px-8">
          <LinearGradient
            colors={["rgba(184,134,11,0.08)", "rgba(184,134,11,0.03)"]}
            style={{
              width: "100%",
              borderRadius: 28,
              borderWidth: 1,
              borderColor: "rgba(184,134,11,0.2)",
              padding: 32,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "rgba(184,134,11,0.12)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 36 }}>🌙</Text>
            </View>
            <Text
              style={{
                color: "#1C1208",
                fontSize: 22,
                fontWeight: "800",
                textAlign: "center",
                marginBottom: 10,
                letterSpacing: -0.3,
              }}
            >
              You've seen everyone
            </Text>
            <View
              style={{
                width: 40,
                height: 2,
                backgroundColor: "#B8860B",
                borderRadius: 1,
                marginBottom: 14,
                opacity: 0.5,
              }}
            />
            <Text
              style={{
                color: "#6B5D4F",
                fontSize: 14,
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              You've reviewed all compatible profiles for now.{"\n"}
              New profiles refresh daily — check back tomorrow for fresh matches.
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(184,134,11,0.1)",
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                gap: 8,
                marginBottom: 24,
              }}
            >
              <Ionicons name="time-outline" size={16} color="#B8860B" />
              <Text style={{ color: "#B8860B", fontSize: 13, fontWeight: "600" }}>
                Refreshes tomorrow
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/(main)/likes?tab=seen")}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              })}
            >
              <Ionicons name="eye-outline" size={16} color="#9E8E7E" />
              <Text style={{ color: "#9E8E7E", fontSize: 13, fontWeight: "500" }}>
                Review already seen profiles
              </Text>
            </Pressable>
          </LinearGradient>
        </View>
      ) : profiles.length === 0 && !isLoading ? (
        /* No profiles at all — filters too strict or new user */
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-4xl mb-4">🔍</Text>
          <Text className="text-[#1C1208] text-lg font-semibold mb-2">
            No profiles found
          </Text>
          <Text className="text-[#9E8E7E] text-center text-sm mb-5">
            Try adjusting your filters or check back later as new members join.
          </Text>
          <Pressable
            className="bg-[#B8860B] px-6 py-3 rounded-full"
            onPress={() => loadInitial()}
          >
            <Text className="text-white font-semibold text-sm">Refresh</Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-1">
          {/* Profile Grid */}
          <Animated.View style={{
            flex: 1,
            opacity: gridExitAnim,
            transform: [
              { scale: gridExitAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
              { translateY: gridExitAnim.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) },
            ],
          }}>
            <FlatList
              ref={flatListRef}
              data={profiles}
              numColumns={2}
              columnWrapperStyle={{ gap: 14, paddingHorizontal: 20 }}
              contentContainerStyle={{
                gap: 16,
                paddingTop: 4,
                paddingBottom: 16,
              }}
              keyExtractor={(item) => item.id}
              scrollEnabled={!showCertGate && !showIntentGate}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <DiscoverCard
                  profile={item}
                  onPress={() => handleProfilePress(item)}
                  showTick={showTicks}
                  playEntry={isNewBatch}
                  entryIndex={index}
                />
              )}
            />
          </Animated.View>

          {/* Mark as Seen button - only when certified */}
          {!showCertGate && !showIntentGate && (
            <View style={{ paddingBottom: insets.bottom + 90 }} className="px-6 pt-3">
              <Pressable
                onPress={handleMarkAsSeen}
                disabled={isLoading || showTicks || profiles.length === 0}
                style={({ pressed }) => ({
                  opacity: isLoading || showTicks || profiles.length === 0 ? 0.5 : pressed ? 0.8 : 1,
                })}
                className="flex-row items-center justify-center bg-white border border-[#EDE5D5] rounded-2xl py-3.5 gap-2"
              >
                {isLoading && !showTicks ? (
                  <ActivityIndicator size="small" color="#B8860B" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color={hasMore ? "#22C55E" : "#9CA3AF"}
                    />
                    <Text
                      className="font-semibold text-sm"
                      style={{ color: hasMore ? "#16A34A" : "#9CA3AF" }}
                    >
                      {hasMore ? "Mark as Seen" : "No more profiles"}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Certification Gate Overlay */}
      {showCertGate && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <BlurView
            intensity={60}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[
              "rgba(0,0,0,0.2)",
              "rgba(0,0,0,0.6)",
              "rgba(0,0,0,0.92)",
            ]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.overlayContent}>
            {/* Card */}
            <View style={styles.cardOuter}>
              {/* Gold border wrapper */}
              <LinearGradient
                colors={[
                  "rgba(212,160,23,0.5)",
                  "rgba(184,134,11,0.2)",
                  "rgba(150,112,10,0.5)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardBorderGradient}
              >
                <View style={styles.cardInner}>
                  {/* Top gold line */}
                  <LinearGradient
                    colors={["transparent", "#D4A017", "transparent"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.topLine}
                  />

                  {/* Icon */}
                  <View style={styles.iconWrapper}>
                    <View style={styles.iconGlow}>
                      <LinearGradient
                        colors={["#D4A017", "#B8860B"]}
                        style={styles.iconCircle}
                      >
                        <Ionicons
                          name="lock-open-outline"
                          size={38}
                          color="#fff"
                        />
                      </LinearGradient>
                    </View>
                  </View>

                  {/* Title */}
                  <Text style={styles.title}>Unlock Discover</Text>

                  {/* Divider */}
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>MARRIAGE FOUNDATIONS</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Description */}
                  <Text style={styles.description}>
                    Complete the Marriage Foundations modules to set your
                    requirements and obligations before discovering profiles.
                  </Text>

                  {/* Feature list */}
                  <View style={styles.featureList}>
                    {[
                      {
                        icon: "checkmark-circle" as const,
                        text: "Set your expectations for marriage",
                      },
                      {
                        icon: "analytics-outline" as const,
                        text: "See compatibility scores with each profile",
                      },
                      {
                        icon: "heart-circle-outline" as const,
                        text: "Find profiles aligned with your values",
                      },
                    ].map((feature, i) => (
                      <View key={i} style={styles.featureRow}>
                        <View style={styles.featureIconBg}>
                          <Ionicons
                            name={feature.icon}
                            size={18}
                            color="#D4A017"
                          />
                        </View>
                        <Text style={styles.featureText}>{feature.text}</Text>
                      </View>
                    ))}
                  </View>

                  {/* CTA Button */}
                  <Pressable
                    onPress={() =>
                      router.push("/(main)/profile/marriage-foundations")
                    }
                    style={({ pressed }) => [
                      styles.ctaWrapper,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <LinearGradient
                      colors={["#D4A017", "#B8860B"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.ctaButton}
                    >
                      <Ionicons
                        name="school-outline"
                        size={22}
                        color="#fff"
                        style={{ marginRight: 10 }}
                      />
                      <Text style={styles.ctaText}>Complete Modules</Text>
                    </LinearGradient>
                  </Pressable>

                  {/* Bottom gold line */}
                  <LinearGradient
                    colors={["transparent", "rgba(212,160,23,0.3)", "transparent"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.bottomLine}
                  />
                </View>
              </LinearGradient>
            </View>
          </View>
        </View>
      )}

      {/* Intent Questions Gate Overlay */}
      {showIntentGate && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <BlurView
            intensity={60}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[
              "rgba(0,0,0,0.2)",
              "rgba(0,0,0,0.6)",
              "rgba(0,0,0,0.92)",
            ]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.overlayContent}>
            <View style={styles.cardOuter}>
              <LinearGradient
                colors={[
                  "rgba(212,160,23,0.5)",
                  "rgba(184,134,11,0.2)",
                  "rgba(150,112,10,0.5)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardBorderGradient}
              >
                <View style={styles.cardInner}>
                  <LinearGradient
                    colors={["transparent", "#D4A017", "transparent"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.topLine}
                  />

                  <View style={styles.iconWrapper}>
                    <View style={styles.iconGlow}>
                      <LinearGradient
                        colors={["#D4A017", "#B8860B"]}
                        style={styles.iconCircle}
                      >
                        <Ionicons
                          name="chatbubbles-outline"
                          size={38}
                          color="#fff"
                        />
                      </LinearGradient>
                    </View>
                  </View>

                  <Text style={styles.title}>Set Your Questions</Text>

                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>INTENT QUESTIONS</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <Text style={styles.description}>
                    Set 3-6 questions that others must answer to express
                    interest in you. This ensures meaningful and intentional
                    connections.
                  </Text>

                  <Pressable
                    onPress={() =>
                      router.push("/(main)/swipe/setup-questions")
                    }
                    style={({ pressed }) => [
                      styles.ctaWrapper,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <LinearGradient
                      colors={["#D4A017", "#B8860B"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.ctaButton}
                    >
                      <Ionicons
                        name="create-outline"
                        size={22}
                        color="#fff"
                        style={{ marginRight: 10 }}
                      />
                      <Text style={styles.ctaText}>Set Up Questions</Text>
                    </LinearGradient>
                  </Pressable>

                  <LinearGradient
                    colors={["transparent", "rgba(212,160,23,0.3)", "transparent"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.bottomLine}
                  />
                </View>
              </LinearGradient>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  cardOuter: {
    width: "100%",
    borderRadius: 28,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 20,
  },
  cardBorderGradient: {
    borderRadius: 28,
    padding: 1.5,
  },
  cardInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26.5,
    overflow: "hidden",
  },
  topLine: {
    height: 2,
  },
  bottomLine: {
    height: 1,
    marginTop: 4,
  },
  iconWrapper: {
    alignItems: "center",
    marginTop: 36,
    marginBottom: 24,
  },
  iconGlow: {
    shadowColor: "#D4A017",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 25,
    elevation: 12,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#1C1208",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(184,134,11,0.25)",
  },
  dividerText: {
    color: "#B8860B",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    marginHorizontal: 12,
  },
  description: {
    color: "#6B5D4F",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 28,
    paddingHorizontal: 24,
  },
  featureList: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  featureIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(184,134,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(184,134,11,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  featureText: {
    color: "#6B5D4F",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  ctaWrapper: {
    marginHorizontal: 24,
    marginBottom: 28,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
