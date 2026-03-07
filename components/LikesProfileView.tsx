import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getFlagByName } from "../lib/countries";
import { supabase } from "../lib/supabase";
import { formatLastActive } from "../lib/utils/timeUtils";

const { width, height } = Dimensions.get("window");

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

export default function LikesProfileView({ profile }: { profile: any }) {
  const router = useRouter();
  const photos = profile.photos || [];
  const [prompts, setPrompts] = useState<any[]>([]);

  const fullName =
    profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.name || "Unknown";

  const age = calculateAge(profile.dob);
  const activeInfo = formatLastActive(profile.last_active_at);

  // Extract profile data
  const height = profile.height || "";
  const maritalStatus = profile.marital_status || "";
  const hasChildren = profile.has_children ?? null;
  const education = profile.education || "";
  const profession = profile.profession || "";
  const ethnicity = profile.ethnicity || "";
  const nationality = profile.nationality || "";
  const bio = profile.bio || "";
  // Handle location - prioritize new city/country fields
  const location = profile.city || profile.country
    ? `${profile.city || ''}${profile.city && profile.country ? ', ' : ''}${profile.country || ''}`
    : (profile.location
      ? (typeof profile.location === 'string'
        ? (profile.location.startsWith('POINT') ? 'Nearby' : profile.location)
        : `${profile.location.city || ''}${profile.location.city && profile.location.country ? ', ' : ''}${profile.location.country || ''}`)
      : null);

  // Fetch prompts
  useEffect(() => {
    const fetchPrompts = async () => {
      if (!profile.id) return;
      const { data } = await supabase
        .from("user_prompts")
        .select("question, answer, display_order")
        .eq("user_id", profile.id)
        .order("display_order", { ascending: true });
      if (data) setPrompts(data);
    };
    fetchPrompts();
  }, [profile.id]);

  // Check if sections should be shown
  const hasPersonalInfo = height || maritalStatus || hasChildren !== null || education || profession;
  const hasLifestyleInfo = Boolean(location);
  const hasBackgroundInfo = ethnicity || nationality;
  const hasPrompts = prompts && prompts.length > 0 && prompts.some((p: any) => p.question && p.answer);

  // Render image with optional name/age overlay (only for first image)
  const renderImage = (photo: string, index: number) => {
    const isMainPhoto = index === 0;
    const screenHeight = Dimensions.get('window').height;

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
          blurRadius={profile?.blur_photos && !profile?.is_liked_by_them ? 50 : 0}
        />

        {/* Name, Age, and Active status overlay on first image only */}
        {isMainPhoto && (
          <View style={styles.nameOverlay}>
            <Text style={styles.nameOverlayText}>
              {fullName}{age !== null ? `, ${age}` : ''}
            </Text>
            {activeInfo && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: activeInfo.dotColor }} />
                <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "500" }}>
                  {activeInfo.label}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // Build sections array - alternate between images and data
  const sections: any[] = [];
  let imageIndex = 0;
  let sectionIndex = 0;

  const dataSections: any[] = [];

  // Add first image
  if (photos.length > 0) {
    sections.push(renderImage(photos[0], 0));
    imageIndex = 1;
  }

  // Review Compatibility button — right under the main photo
  if (profile.id) {
    sections.push(
      <Pressable
        key="review-compatibility"
        onPress={() =>
          router.push({
            pathname: "/(main)/profile/compatibility-review",
            params: { profileId: profile.id, profileName: profile.first_name || "them" },
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
  }

  // Personal Info
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
              <Text style={styles.infoChipText}>👶 {hasChildren ? "Has children" : "No children"}</Text>
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

  // Lifestyle
  if (hasLifestyleInfo) {
    dataSections.push(
      <View key="lifestyle" style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Lifestyle</Text>
        <View style={styles.chipsContainer}>
          {location && (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>
                {getFlagByName(profile.country || "") || "📍"} {location}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Background
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

  // About Me
  if (bio) {
    dataSections.push(
      <View key="bio" style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>About Me</Text>
        <Text style={styles.bioText}>{bio}</Text>
      </View>
    );
  }

  // Prompts
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

  return (
    <View style={styles.container}>
      {photos.length > 0 ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {sections}
        </ScrollView>
      ) : (
        <View style={[styles.mainImageContainer, styles.placeholder]}>
          <Text style={styles.placeholderText}>👤</Text>
        </View>
      )}
    </View>
  );
}

const getStyles = () => {
  const screenHeight = Dimensions.get('window').height;

  return StyleSheet.create({
    container: {
      width,
      height,
      position: "relative",
      backgroundColor: "#FDFAF5",
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 200, // Space for action buttons
    },
    mainImageContainer: {
      width: '100%',
      height: screenHeight * 0.65,
      position: 'relative',
      marginBottom: 16,
    },
    mainImage: {
      width: '100%',
      height: '100%',
    },
    secondaryImageContainer: {
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#B8860B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 14,
      elevation: 5,
    },
    secondaryImage: {
      width: '100%',
      height: screenHeight * 0.5,
      borderRadius: 20,
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
      marginTop: 24,
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
      color: '#1C1208',
      fontSize: 14,
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
      marginTop: 24,
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
    placeholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderText: {
      fontSize: 80,
      color: '#9E8E7E',
    },
    compatibilityButtonWrapper: {
      marginHorizontal: 20,
      marginTop: 24,
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
};

const styles = getStyles();

