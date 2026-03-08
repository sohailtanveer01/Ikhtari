import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { BlurView } from "expo-blur";
import { ActivityIndicator, Dimensions, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFlagByName } from "../../../lib/countries";
import { useCertification } from "../../../lib/hooks/useCertification";
import { supabase } from "../../../lib/supabase";

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function UserProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, chatId } = useLocalSearchParams<{ userId: string; chatId?: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const { data: certification } = useCertification();
  const isCertified = certification?.is_certified === true;

  const [photos, setPhotos] = useState<string[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [height, setHeight] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [dob, setDob] = useState("");
  const [education, setEducation] = useState("");
  const [profession, setProfession] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [nationality, setNationality] = useState("");
  const [bio, setBio] = useState("");
  const [prompts, setPrompts] = useState<any[]>([]);
  const [location, setLocation] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Don't redirect - just return
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      // Fetch prompts from user_prompts table
      const { data: promptsData } = await supabase
        .from("user_prompts")
        .select("question, answer, display_order")
        .eq("user_id", userId)
        .order("display_order", { ascending: true });

      if (promptsData) {
        setPrompts(promptsData);
      }

      setProfile(data);

      // Handle name - prefer first_name/last_name, fallback to name
      if (data.first_name && data.last_name) {
        setFirstName(data.first_name);
        setLastName(data.last_name);
      } else if (data.name) {
        const nameParts = data.name.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }

      setHeight(data.height || "");
      setMaritalStatus(data.marital_status || "");
      setHasChildren(data.has_children ?? null);
      setDob(data.dob || "");
      setEducation(data.education || "");
      setProfession(data.profession || "");
      setEthnicity(data.ethnicity || "");
      setNationality(data.nationality || "");
      setBio(data.bio || "");
      setPhotos(data.photos || []);

      // Handle location data
      if (data.city || data.country) {
        setLocation(`${data.city || ''}${data.city && data.country ? ', ' : ''}${data.country || ''}`);
      } else if (data.location) {
        if (typeof data.location === 'string') {
          setLocation(data.location.startsWith('POINT') ? 'Nearby' : data.location);
        } else if (data.location.city || data.location.country) {
          setLocation(`${data.location.city || ''}${data.location.city && data.location.country ? ', ' : ''}${data.location.country || ''}`);
        } else if (data.location.lat && data.location.lon) {
          setLocation(`${data.location.lat.toFixed(2)}, ${data.location.lon.toFixed(2)}`);
        }
      }

      // Track view
      try {
        await supabase.functions.invoke("create-profile-view", {
          body: { viewed_id: userId },
        });
      } catch (viewError) {
        console.error("Error recording profile view:", viewError);
      }

      setLoading(false);
    } catch (error: any) {
      console.error("Error loading profile:", error);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FDFAF5', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FDFAF5', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#1C1208', fontSize: 18, textAlign: 'center', marginBottom: 20 }}>
          Profile not found
        </Text>
        <Pressable
          onPress={() => {
            // If opened from chat, navigate back to chat screen using replace
            // This ensures we don't go back to swipe screen or likes tab
            if (chatId) {
              router.replace(`/(main)/chat/${chatId}`);
            } else {
              router.back();
            }
          }}
          style={{
            backgroundColor: '#B8860B',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const age = calculateAge(dob);
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : profile.name || "Unknown";

  // Render image section with premium styling
  const renderImage = (photo: string, index: number) => {
    const isMainPhoto = index === 0;
    return (
      <View 
        key={`photo-${index}`} 
        style={isMainPhoto ? styles.mainImageContainer : styles.secondaryImageContainer}
      >
        <Image
          source={{ uri: photo }}
          style={isMainPhoto ? styles.mainImage : styles.secondaryImage}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          priority={isMainPhoto ? "high" : "normal"}
        />
        {isMainPhoto && (
          <View style={styles.nameOverlay}>
            <Text style={styles.nameOverlayText}>
              {fullName}
              {age !== null ? `, ${age}` : ""}
            </Text>
            {profession && (
              <Text style={styles.professionText}>
                {profession}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  // Render data section with premium styling
  const renderDataSection = (title: string, content: React.ReactNode, key: string, isPrompt = false) => (
    <View key={key} style={isPrompt ? styles.promptCard : styles.sectionCard}>
      <Text style={isPrompt ? styles.promptQuestion : styles.sectionTitle}>
        {title}
      </Text>
      <View style={styles.sectionContent}>{content}</View>
    </View>
  );

  const hasPersonalInfo = height || maritalStatus || hasChildren !== null || education || profession;
  const hasBackgroundInfo = ethnicity || nationality || location;

  return (
    <View style={{ flex: 1, backgroundColor: '#FDFAF5' }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Build alternating layout: Image -> Data -> Image -> Data... */}
        {(() => {
          const sections: React.ReactElement[] = [];
          let imageIndex = 0;
          let sectionIndex = 0;

          // Always start with first image (with name/age overlay) - full screen
          if (photos.length > 0) {
            sections.push(
              <View key="main-photo-container" style={{ position: 'relative' }}>
                {renderImage(photos[0], 0)}
                {/* Back Button - Overlay on main photo */}
                <View style={styles.topBar}>
                  <Pressable
                    onPress={() => {
                      if (chatId) {
                        router.replace(`/(main)/chat/${chatId}`);
                      } else {
                        router.back();
                      }
                    }}
                    style={styles.backButton}
                  >
                    <BlurView
                      intensity={Platform.OS === "ios" ? 55 : 0}
                      tint="dark"
                      style={StyleSheet.absoluteFill}
                    />
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            );
            imageIndex = 1;
          }

          // Collect all data sections
          const dataSections: React.ReactElement[] = [];

          if (hasPersonalInfo) {
            dataSections.push(
              renderDataSection(
                "Personal Info",
                <View style={styles.chipsContainer}>
                  {height && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>📏 {height}</Text>
                    </View>
                  )}
                  {maritalStatus && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>💍 {maritalStatus}</Text>
                    </View>
                  )}
                  {hasChildren !== null && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>
                        👶 {hasChildren ? "Has Children" : "No Children"}
                      </Text>
                    </View>
                  )}
                  {education && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>🎓 {education}</Text>
                    </View>
                  )}
                  {profession && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>💼 {profession}</Text>
                    </View>
                  )}
                </View>,
                `personal-${sectionIndex++}`
              )
            );
          }

          if (bio) {
            dataSections.push(
              renderDataSection(
                "About",
                <Text style={styles.bioText}>{bio}</Text>,
                `bio-${sectionIndex++}`
              )
            );
          }

          if (prompts.length > 0) {
            prompts.forEach((prompt, idx) => {
              dataSections.push(
                renderDataSection(
                  prompt.question || "Prompt",
                  <Text style={styles.promptAnswer}>{prompt.answer}</Text>,
                  `prompt-${idx}`,
                  true
                )
              );
            });
          }


          if (hasBackgroundInfo) {
            dataSections.push(
              renderDataSection(
                "Background",
                <View style={styles.chipsContainer}>
                  {ethnicity && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>🌍 {ethnicity}</Text>
                    </View>
                  )}
                  {nationality && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>
                        {getFlagByName(nationality) || "🏳️"} {nationality}
                      </Text>
                    </View>
                  )}
                  {location && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>📍 {location}</Text>
                    </View>
                  )}
                </View>,
                `background-${sectionIndex++}`
              )
            );
          }

          // Interleave images and data sections
          dataSections.forEach((dataSection, idx) => {
            sections.push(dataSection);
            // Add next image after each data section (if available)
            if (imageIndex < photos.length) {
              sections.push(renderImage(photos[imageIndex], imageIndex));
              imageIndex++;
            }
          });

          // Add remaining images at the end
          while (imageIndex < photos.length) {
            sections.push(renderImage(photos[imageIndex], imageIndex));
            imageIndex++;
          }

          // Review Compatibility button at the very end
          if (profile?.id) {
            if (isCertified) {
              // Certified — show full Review Compatibility button
              sections.push(
                <Pressable
                  key="review-compatibility"
                  onPress={() =>
                    router.push({
                      pathname: "/(main)/profile/compatibility-review",
                      params: { profileId: profile.id, profileName: firstName || "them" },
                    })
                  }
                  style={styles.compatibilityButtonWrapper}
                >
                  <LinearGradient
                    colors={["#2A1505", "#5C3010", "#9E6A08", "#B8860B"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.compatibilityButton}
                  >
                    <View style={styles.compatRing1} />
                    <View style={styles.compatRing2} />
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                      <View style={styles.compatIconCircle}>
                        <Ionicons name="stats-chart" size={22} color="#FFD060" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={styles.compatMicroLabel}>IKHTIAR</Text>
                        <Text style={styles.compatTitle}>Review Compatibility</Text>
                        <Text style={styles.compatSubtitle}>See how aligned your values are</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="rgba(255,220,100,0.7)" />
                    </View>
                  </LinearGradient>
                </Pressable>
              );
            } else {
              // Not certified — show locked Review Compatibility + clear CTA
              sections.push(
                <View key="review-compatibility-locked" style={styles.compatibilityButtonWrapper}>
                  {/* Dimmed locked button */}
                  <View style={{ opacity: 0.45, marginBottom: 12 }}>
                    <LinearGradient
                      colors={["#2A1505", "#5C3010", "#9E6A08", "#B8860B"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.compatibilityButton}
                    >
                      <View style={styles.compatRing1} />
                      <View style={styles.compatRing2} />
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                        <View style={[styles.compatIconCircle, { backgroundColor: "rgba(255,208,96,0.15)" }]}>
                          <Ionicons name="lock-closed" size={20} color="#FFD060" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                          <Text style={styles.compatMicroLabel}>IKHTIAR</Text>
                          <Text style={styles.compatTitle}>Review Compatibility</Text>
                          <Text style={styles.compatSubtitle}>Complete the course to unlock</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </View>
                  {/* CTA */}
                  <Pressable
                    onPress={() => router.push("/(main)/profile/marriage-foundations")}
                    style={({ pressed }) => ({
                      borderRadius: 16,
                      overflow: "hidden",
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                      shadowColor: "#B8860B",
                      shadowOpacity: pressed ? 0.3 : 0.55,
                      shadowRadius: 14,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 8,
                    })}
                  >
                    <LinearGradient
                      colors={["#E8B820", "#C9980A", "#A87A08"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 16,
                        paddingHorizontal: 24,
                        gap: 10,
                      }}
                    >
                      <Ionicons name="school-outline" size={20} color="#fff" />
                      <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: 0.3 }}>
                        Go to Marriage Foundations
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              );
            }
          }

          return sections;
        })()}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  mainImageContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.7,
    position: 'relative',
    marginBottom: 16,
    overflow: 'hidden',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  secondaryImageContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  secondaryImage: {
    width: '100%',
    height: Dimensions.get('window').height * 0.5,
    borderRadius: 24,
  },
  nameOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  nameOverlayText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  professionText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(184,134,11,0.28)",
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9E8E7E",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  sectionContent: {
    gap: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(184, 134, 11, 0.4)",
    backgroundColor: "rgba(184, 134, 11, 0.07)",
  },
  infoChipText: {
    fontSize: 14,
    color: '#1C1208',
    fontWeight: '600',
  },
  bioText: {
    fontSize: 17,
    lineHeight: 26,
    color: "#6B5D4F",
    fontWeight: "500",
  },
  promptCard: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(184,134,11,0.28)",
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 5,
  },
  promptQuestion: {
    fontSize: 13,
    fontWeight: "800",
    color: "#B8860B",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  promptAnswer: {
    fontSize: 22,
    lineHeight: 30,
    color: "#1C1208",
    fontWeight: "800",
  },
  compatibilityButtonWrapper: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#3D2000",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  compatibilityButton: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  compatRing1: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: "rgba(255,220,100,0.1)",
  },
  compatRing2: {
    position: "absolute",
    top: -10,
    right: -10,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "rgba(255,220,100,0.07)",
  },
  compatIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,220,100,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,220,100,0.22)",
  },
  compatMicroLabel: {
    color: "rgba(255,220,100,0.7)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  compatTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  compatSubtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    marginTop: 3,
  },
});

