import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { BlurView } from "expo-blur";
import { ActivityIndicator, Dimensions, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getFlagByName } from "../../../lib/countries";
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

export default function ProfilePreviewScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // Determine if viewing own profile or someone else's
  const [isViewingOwnProfile, setIsViewingOwnProfile] = useState(false);
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      // If userId is provided, view that user's profile; otherwise view own profile
      const profileUserId = userId || user.id;
      const isViewingOtherProfile = userId && userId !== user.id;
      const isOwnProfile = !userId || userId === user.id;

      setIsViewingOwnProfile(isOwnProfile);

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", profileUserId)
        .single();

      if (error) throw error;

      // Fetch prompts from user_prompts table
      const { data: promptsData } = await supabase
        .from("user_prompts")
        .select("question, answer, display_order")
        .eq("user_id", profileUserId)
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

      // Handle location data - prioritize city and country fields
      if (data.city || data.country) {
        setLocation(`${data.city || ''}${data.city && data.country ? ', ' : ''}${data.country || ''}`);
      } else if (data.location) {
        if (typeof data.location === 'string') {
          setLocation(data.location.startsWith('POINT') ? 'Nearby' : data.location);
        } else if (data.location.city || data.location.country) {
          setLocation(`${data.location.city || ''}${data.location.city && data.location.country ? ', ' : ''}${data.location.country || ''}`);
        } else if (data.location.lat && data.location.lon) {
          // PostGIS point - coordinates fallback
          setLocation(`${data.location.lat.toFixed(2)}, ${data.location.lon.toFixed(2)}`);
        }
      }

      // Track view if viewing someone else's profile
      if (isViewingOtherProfile) {
        try {
          await supabase.functions.invoke("create-profile-view", {
            body: { viewed_id: profileUserId },
          });
        } catch (viewError) {
          console.error("Error recording profile view:", viewError);
          // Don't fail the profile load if view tracking fails
        }
      }

      setLoading(false);
    } catch (error: any) {
      console.error("Error loading profile:", error);
      setLoading(false);
    }
  }, [userId, router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Reload profile when screen comes into focus (e.g., after removing a photo)
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FDFAF5', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FDFAF5', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#1C1208' }}>No profile found</Text>
      </View>
    );
  }

  const fullName = firstName && lastName ? `${firstName} ${lastName}` : profile?.name || "Unknown";
  const age = calculateAge(dob);

  // Helper functions to check if sections should be shown
  const hasPersonalInfo = height || maritalStatus || hasChildren !== null || education || profession;
  const hasLifestyleInfo = Boolean(location);
  const hasBackgroundInfo = ethnicity || nationality;
  const hasPrompts = prompts && prompts.length > 0 && prompts.some((p: any) => p.question && p.answer);


  // Render image with optional name/age overlay (only for first image)
  const renderImage = (photo: string, index: number) => {
    const isMainPhoto = index === 0;

    return (
      <View
        key={index}
        style={[
          isMainPhoto ? styles.mainImageContainer : styles.secondaryImageContainer
        ]}
      >
        <Image
          source={{ uri: photo }}
          style={[
            isMainPhoto ? styles.mainImage : styles.secondaryImage
          ]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          priority={isMainPhoto ? "high" : "normal"}
        />

        {/* Name and Age overlay on first image only */}
        {isMainPhoto && (
          <View style={styles.nameOverlay}>
            <Text style={styles.nameOverlayText}>
              {fullName}{age !== null ? `, ${age}` : ''}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FDFAF5' }}>
      {/* Back Button - Fixed at top */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            if (isViewingOwnProfile) {
              router.push("/(main)/profile");
            } else {
              router.push("/(main)/swipe");
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

      {/* Scrollable Profile Preview */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Build alternating layout: Image -> Data -> Image -> Data... */}
        {(() => {
          const sections: JSX.Element[] = [];
          let imageIndex = 0;
          let sectionIndex = 0;

          // Always start with first image (with name/age overlay)
          if (photos.length > 0) {
            sections.push(renderImage(photos[0], 0));
            imageIndex = 1;
          }

          // Collect all data sections
          const dataSections: JSX.Element[] = [];

          if (hasPersonalInfo) {
            dataSections.push(
              <View key="personal" style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Essentials</Text>
                <View style={styles.chipsContainer}>
                  {height && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>📏 {height}</Text>
                    </View>
                  )}
                  {maritalStatus && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>💍 {maritalStatus.charAt(0).toUpperCase() + maritalStatus.slice(1)}</Text>
                    </View>
                  )}
                  {hasChildren !== null && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>{hasChildren ? "👶 Has children" : "👶 No children"}</Text>
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
                </View>
              </View>
            );
          }

          if (hasLifestyleInfo) {
            dataSections.push(
              <View key="lifestyle" style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Location</Text>
                <View style={styles.chipsContainer}>
                  {location && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>
                        {getFlagByName(profile?.country || "") || "📍"} {location}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }

          if (hasBackgroundInfo) {
            dataSections.push(
              <View key="background" style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Background</Text>
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
                </View>
              </View>
            );
          }

          if (bio) {
            dataSections.push(
              <View key="about" style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Bio</Text>
                <Text style={styles.bioText}>{bio}</Text>
              </View>
            );
          }

          if (hasPrompts) {
            dataSections.push(
              <View key="prompts" style={styles.promptsContainer}>
                {prompts
                  .filter((p: any) => p.question && p.answer)
                  .map((prompt: any, index: number) => (
                    <View key={index} style={styles.promptCard}>
                      <Text style={styles.promptQuestion}>{prompt.question}</Text>
                      <Text style={styles.promptAnswer}>{prompt.answer}</Text>
                    </View>
                  ))}
              </View>
            );
          }

          // Alternate between images and data sections
          while (imageIndex < photos.length || sectionIndex < dataSections.length) {
            // Add data section if available
            if (sectionIndex < dataSections.length) {
              sections.push(dataSections[sectionIndex]);
              sectionIndex++;
            }

            // Add image if available
            if (imageIndex < photos.length) {
              sections.push(renderImage(photos[imageIndex], imageIndex));
              imageIndex++;
            }
          }

          return sections;
        })()}
      </ScrollView>
    </View>
  );
}

const getStyles = () => {
  const screenHeight = Dimensions.get('window').height;

  return StyleSheet.create({
    topBar: {
      paddingTop: 50,
      paddingBottom: 12,
      paddingHorizontal: 20,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
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
      marginHorizontal: 20,
      height: screenHeight * 0.65,
      position: 'relative',
      marginBottom: 16,
      borderRadius: 24,
      overflow: 'hidden',
      marginTop: 80, // Space for the back button
    },
    mainImage: {
      width: '100%',
      height: '100%',
      borderRadius: 24,
    },
    secondaryImageContainer: {
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: 24,
      overflow: 'hidden',
    },
    secondaryImage: {
      width: '100%',
      height: screenHeight * 0.5,
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
    horizontalChipsContainer: {
      flexDirection: 'row',
      gap: 10,
      paddingRight: 20,
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
    promptsContainer: {
      paddingHorizontal: 20,
      marginTop: 8,
      gap: 16,
    },
    promptCard: {
      backgroundColor: "rgba(255,255,255,0.72)",
      borderRadius: 24,
      padding: 24,
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
  });
};

const styles = getStyles();