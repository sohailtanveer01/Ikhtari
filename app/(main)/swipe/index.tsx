import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DiscoverCard from "../../../components/DiscoverCard";
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
  const feedMode = useDiscoverStore((s) => s.feedMode);
  const setFeedMode = useDiscoverStore((s) => s.setFeedMode);

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
  const [userPrefs, setUserPrefs] = useState<any>(null);

  const flatListRef = useRef<FlatList>(null);

  const hasAnyFilter = (prefs: any) => {
    if (!prefs) return false;
    return (
      prefs.location_enabled ||
      prefs.age_min != null ||
      prefs.age_max != null ||
      prefs.height_min_cm != null ||
      (prefs.ethnicity_preferences?.length > 0) ||
      (prefs.marital_status_preferences?.length > 0) ||
      (prefs.children_preferences?.length > 0)
    );
  };

  // Check if user has set intent questions
  const checkIntentQuestions = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [profileResult, prefsResult] = await Promise.all([
        supabase.from("users").select("intent_questions_set").eq("id", user.id).single(),
        supabase.from("user_preferences").select("*").eq("user_id", user.id).single(),
      ]);

      setIntentQuestionsSet(profileResult.data?.intent_questions_set ?? false);
      setUserPrefs(prefsResult.data ?? null);
    } catch (e) {
      console.error("Error checking intent questions:", e);
      setIntentQuestionsSet(false);
    } finally {
      setCheckingQuestions(false);
    }
  }, []);

  const handleFilterFitPress = useCallback(() => {
    if (feedMode === 'filters') return;
    if (!hasAnyFilter(userPrefs)) {
      Alert.alert(
        "No Filters Set",
        "Add at least one filter to discover profiles that match your preferences.",
        [
          { text: "Not Now", style: "cancel" },
          {
            text: "Set Filters",
            onPress: () => router.push("/(main)/swipe/filters"),
          },
        ]
      );
      return;
    }
    setFeedMode('filters');
  }, [feedMode, userPrefs, setFeedMode, router]);

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
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 }}>

        {/* Left: feed mode toggle (certified only) */}
        {isCertified ? (
          <View style={{
            flexDirection: 'row',
            backgroundColor: '#F5F0E8',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(184,134,11,0.2)',
            padding: 3,
          }}>
            <Pressable
              onPress={() => feedMode !== 'compatible' && setFeedMode('compatible')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 9,
                gap: 5,
                backgroundColor: feedMode === 'compatible' ? '#fff' : 'transparent',
                shadowColor: '#B8860B',
                shadowOpacity: feedMode === 'compatible' ? 0.12 : 0,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 1 },
                elevation: feedMode === 'compatible' ? 2 : 0,
              }}
            >
              <Ionicons name="sparkles" size={12} color={feedMode === 'compatible' ? '#B8860B' : '#B0A090'} />
              <Text style={{ fontSize: 12, fontWeight: feedMode === 'compatible' ? '700' : '500', color: feedMode === 'compatible' ? '#B8860B' : '#B0A090' }}>
                Compatible
              </Text>
            </Pressable>
            <Pressable
              onPress={handleFilterFitPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 9,
                gap: 5,
                backgroundColor: feedMode === 'filters' ? '#fff' : 'transparent',
                shadowColor: '#B8860B',
                shadowOpacity: feedMode === 'filters' ? 0.12 : 0,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 1 },
                elevation: feedMode === 'filters' ? 2 : 0,
              }}
            >
              <Ionicons name="options-outline" size={12} color={feedMode === 'filters' ? '#B8860B' : '#B0A090'} />
              <Text style={{ fontSize: 12, fontWeight: feedMode === 'filters' ? '700' : '500', color: feedMode === 'filters' ? '#B8860B' : '#B0A090' }}>
                Filter Fit
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ width: 38 }} />
        )}

        {/* Right: filter icon (certified only) */}
        <View style={{ marginLeft: 'auto' }}>
          {isCertified ? (
            <Pressable
              onPress={() => router.push("/(main)/swipe/filters")}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#F5F0E8',
                borderWidth: 1,
                borderColor: 'rgba(184,134,11,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="options-outline" size={20} color="#B8860B" />
            </Pressable>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>

      </View>

      {/* Profile Grid - always rendered */}
      {isLoading && profiles.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#B8860B" />
        </View>
      ) : profiles.length === 0 && !isLoading && hasMarkedSeen ? (
        /* All compatible profiles seen — come back tomorrow */
        <View className="flex-1 items-center justify-center px-6">
          {/* Stars decoration */}
          <View style={{ position: "absolute", top: "15%", left: "12%", opacity: 0.25 }}>
            <Ionicons name="star" size={10} color="#B8860B" />
          </View>
          <View style={{ position: "absolute", top: "22%", right: "18%", opacity: 0.18 }}>
            <Ionicons name="star" size={7} color="#B8860B" />
          </View>
          <View style={{ position: "absolute", top: "28%", left: "28%", opacity: 0.2 }}>
            <Ionicons name="star" size={5} color="#B8860B" />
          </View>

          {/* Moon icon */}
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: "rgba(184,134,11,0.08)",
              borderWidth: 1.5,
              borderColor: "rgba(184,134,11,0.2)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 28,
            }}
          >
            <Text style={{ fontSize: 44, lineHeight: 52 }}>🌙</Text>
          </View>

          {/* Heading */}
          <Text
            style={{
              color: "#1C1208",
              fontSize: 26,
              fontWeight: "800",
              textAlign: "center",
              letterSpacing: -0.5,
              marginBottom: 12,
            }}
          >
            You've seen everyone
          </Text>

          {/* Divider */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16, paddingHorizontal: 16 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: "rgba(184,134,11,0.2)" }} />
            <Ionicons name="sparkles" size={13} color="#B8860B" style={{ opacity: 0.6 }} />
            <View style={{ flex: 1, height: 1, backgroundColor: "rgba(184,134,11,0.2)" }} />
          </View>

          {/* Body */}
          <Text
            style={{
              color: "#6B5D4F",
              fontSize: 14,
              textAlign: "center",
              lineHeight: 23,
              marginBottom: 32,
              paddingHorizontal: 8,
            }}
          >
            You've reviewed all your compatible matches for now. New profiles are added daily — come back tomorrow for fresh discoveries.
          </Text>

          {/* Refresh pill */}
          <LinearGradient
            colors={["rgba(184,134,11,0.12)", "rgba(184,134,11,0.06)"]}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "rgba(184,134,11,0.25)",
              marginBottom: 28,
            }}
          >
            <Ionicons name="time-outline" size={16} color="#B8860B" />
            <Text style={{ color: "#B8860B", fontSize: 13, fontWeight: "700", letterSpacing: 0.2 }}>
              New matches tomorrow
            </Text>
          </LinearGradient>

          {/* Review seen link */}
          <Pressable
            onPress={() => router.push("/(main)/likes")}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 20,
              backgroundColor: "rgba(0,0,0,0.04)",
            })}
          >
            <Ionicons name="eye-outline" size={15} color="#9E8E7E" />
            <Text style={{ color: "#9E8E7E", fontSize: 13, fontWeight: "500" }}>
              Review already seen profiles
            </Text>
          </Pressable>
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
              columnWrapperStyle={{ gap: 8, paddingHorizontal: 12 }}
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

          {/* Mark as Seen — bottom */}
          {!showCertGate && !showIntentGate && (
            <View style={{ paddingBottom: insets.bottom + 90, paddingHorizontal: 14, paddingTop: 8 }}>
              <Pressable
                onPress={handleMarkAsSeen}
                disabled={isLoading || showTicks || profiles.length === 0}
                style={({ pressed }) => ({
                  opacity: isLoading || showTicks || profiles.length === 0 ? 0.45 : pressed ? 0.8 : 1,
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(34,197,94,0.3)',
                  shadowColor: '#22C55E',
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 3,
                })}
              >
                <BlurView
                  intensity={Platform.OS === "ios" ? 28 : 0}
                  tint="light"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 15,
                    gap: 9,
                    backgroundColor: Platform.OS === "android" ? "rgba(240,253,244,0.95)" : "rgba(240,253,244,0.6)",
                  }}
                >
                  {isLoading && !showTicks ? (
                    <ActivityIndicator size="small" color="#16A34A" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#16A34A" />
                      <Text style={{ color: "#16A34A", fontWeight: '700', fontSize: 15 }}>
                        Mark as Seen
                      </Text>
                    </>
                  )}
                </BlurView>
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
                        size={20}
                        color="#fff"
                        style={{ marginRight: 8 }}
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
    borderRadius: 18,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 12,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 19,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  ctaText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
});
