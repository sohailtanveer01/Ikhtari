import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import CompatibilityCard from "./CompatibilityCard";
import { getFlagByName } from "../lib/countries";
import { supabase } from "../lib/supabase";

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

export default function LikesProfileView({ profile }: any) {
  const photos = profile.photos || [];
  const [prompts, setPrompts] = useState<any[]>([]);

  const fullName =
    profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.name || "Unknown";

  const age = calculateAge(profile.dob);

  // Extract profile data
  const height = profile.height || "";
  const maritalStatus = profile.marital_status || "";
  const hasChildren = profile.has_children ?? null;
  const education = profile.education || "";
  const profession = profile.profession || "";
  const sect = profile.sect || "";
  const bornMuslim = profile.born_muslim ?? null;
  const religiousPractice = profile.religious_practice || "";
  const alcoholHabit = profile.alcohol_habit || "";
  const smokingHabit = profile.smoking_habit || "";
  const ethnicity = profile.ethnicity || "";
  const nationality = profile.nationality || "";
  const hobbies = profile.hobbies || [];
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
  const hasReligiousInfo = sect || bornMuslim !== null || religiousPractice || alcoholHabit || smokingHabit;
  const hasLifestyleInfo = (hobbies && hobbies.length > 0) || location;
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

  // Compatibility Card (self-manages visibility: only renders if both certified)
  if (profile.id) {
    dataSections.push(
      <CompatibilityCard
        key="compatibility"
        profileId={profile.id}
        profileName={profile.first_name || "them"}
      />
    );
  }

  // Religious
  if (hasReligiousInfo) {
    dataSections.push(
      <View key="religious" style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Religious</Text>
        <View style={styles.chipsContainer}>
          {sect && (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>🕌 {sect}</Text>
            </View>
          )}
          {bornMuslim !== null && (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>✨ {bornMuslim ? "Born Muslim" : "Convert"}</Text>
            </View>
          )}
          {religiousPractice && (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>📿 {religiousPractice}</Text>
            </View>
          )}
          {alcoholHabit && (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>🍷 {alcoholHabit}</Text>
            </View>
          )}
          {smokingHabit && (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>🚬 {smokingHabit}</Text>
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
          {hobbies && hobbies.length > 0 && hobbies.map((hobby: string, idx: number) => (
            <View key={idx} style={styles.infoChip}>
              <Text style={styles.infoChipText}>{hobby}</Text>
            </View>
          ))}
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
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      padding: 20,
      marginHorizontal: 20,
      marginTop: 24,
      borderWidth: 1,
      borderColor: "#EDE5D5",
      shadowColor: "#B8860B",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
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
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: "#EDE5D5",
      shadowColor: "#B8860B",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
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
  });
};

const styles = getStyles();

