import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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

export default function UserProfileScreen() {
  const router = useRouter();
  const { userId, chatId } = useLocalSearchParams<{ userId: string; chatId?: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [height, setHeight] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [dob, setDob] = useState("");
  const [education, setEducation] = useState("");
  const [profession, setProfession] = useState("");
  const [sect, setSect] = useState("");
  const [religiousPractice, setReligiousPractice] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [nationality, setNationality] = useState("");
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [prompts, setPrompts] = useState<any[]>([]);
  const [location, setLocation] = useState<string | null>(null);
  const [bornMuslim, setBornMuslim] = useState<boolean | null>(null);
  const [alcoholHabit, setAlcoholHabit] = useState("");
  const [smokingHabit, setSmokingHabit] = useState("");

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
      setSect(data.sect || "");
      setReligiousPractice(data.religious_practice || "");
      setEthnicity(data.ethnicity || "");
      setNationality(data.nationality || "");
      setHobbies(data.hobbies || []);
      setBio(data.bio || "");
      setPhotos(data.photos || []);
      setBornMuslim(data.born_muslim ?? null);
      setAlcoholHabit(data.alcohol_habit || "");
      setSmokingHabit(data.smoking_habit || "");

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
  const hasReligiousInfo = sect || bornMuslim !== null || religiousPractice;
  const hasLifestyleInfo = alcoholHabit || smokingHabit;
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
                      // If opened from chat, navigate back to chat screen using replace
                      // This ensures we don't go back to swipe screen or likes tab
                      if (chatId) {
                        router.replace(`/(main)/chat/${chatId}`);
                      } else {
                        router.back();
                      }
                    }}
                    style={styles.backButton}
                  >
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

          if (hasReligiousInfo) {
            dataSections.push(
              renderDataSection(
                "Religious Info",
                <View style={styles.chipsContainer}>
                  {sect && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>🕌 {sect}</Text>
                    </View>
                  )}
                  {bornMuslim !== null && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>
                        ⭐ {bornMuslim ? "Born Muslim" : "Converted to Islam"}
                      </Text>
                    </View>
                  )}
                  {religiousPractice && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>📿 {religiousPractice}</Text>
                    </View>
                  )}
                </View>,
                `religious-${sectionIndex++}`
              )
            );
          }

          if (hobbies.length > 0) {
            dataSections.push(
              renderDataSection(
                "Interests",
                <View style={styles.chipsContainer}>
                  {hobbies.map((hobby, i) => (
                    <View key={i} style={styles.infoChip}>
                      <Text style={styles.infoChipText}>🎯 {hobby}</Text>
                    </View>
                  ))}
                </View>,
                `interests-${sectionIndex++}`
              )
            );
          }

          if (hasLifestyleInfo) {
            dataSections.push(
              renderDataSection(
                "Lifestyle",
                <View style={styles.chipsContainer}>
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
                </View>,
                `lifestyle-${sectionIndex++}`
              )
            );
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.5)",
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
    borderColor: "rgba(184, 134, 11, 0.5)",
    backgroundColor: "rgba(184, 134, 11, 0.05)",
  },
  infoChipText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bioText: {
    fontSize: 17,
    lineHeight: 26,
    color: "rgba(255, 255, 255, 0.95)",
    fontWeight: "500",
  },
  promptCard: {
    backgroundColor: "rgba(184, 134, 11, 0.08)",
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(184, 134, 11, 0.25)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
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
    color: "#FFFFFF",
    fontWeight: "800",
  },
});

