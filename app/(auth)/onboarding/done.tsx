import OnboardingBackground from "@/components/OnboardingBackground";
import Logo from "@/components/Logo";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, Text, View } from "react-native";
import { useOnboarding } from "../../../lib/onboardingStore";
import { supabase } from "../../../lib/supabase";

export default function OnboardingDone() {
  const { data } = useOnboarding();
  const router = useRouter();
  const [saving, setSaving] = useState(true);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    saveProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveProfile = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      alert("Please log in to complete your profile.");
      setSaving(false);
      return;
    }

    try {
      // Upload any local photo URIs that haven't been uploaded yet
      const uploadedPhotos: string[] = [];

      for (const photo of data.photos) {
        if (photo.startsWith("http://") || photo.startsWith("https://")) {
          uploadedPhotos.push(photo);
        } else {
          try {
            const ext = photo.split(".").pop() || "jpg";
            const filePath = `${user.id}/${Date.now()}.${ext}`;

            const res = await fetch(photo);
            const blob = await res.arrayBuffer();

            const { error: uploadError } = await supabase.storage
              .from("profile-photos")
              .upload(filePath, blob, { contentType: `image/${ext}` });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
              .from("profile-photos")
              .getPublicUrl(filePath);

            uploadedPhotos.push(urlData.publicUrl);
          } catch (e: any) {
            console.error("Error uploading photo:", e);
          }
        }
      }

      // Build PostGIS geography point if location exists
      const locationPoint = data.location
        ? `SRID=4326;POINT(${data.location.lon} ${data.location.lat})`
        : null;

      const { error } = await supabase.from("users").upsert({
        id: user.id,
        name: `${data.firstName} ${data.lastName}`,
        first_name: data.firstName,
        last_name: data.lastName,
        height: data.height,
        marital_status: data.maritalStatus,
        has_children: data.hasChildren,
        gender: data.gender,
        dob: data.dob,
        ethnicity: data.ethnicity,
        nationality: data.nationality,
        education: data.education,
        profession: data.profession,
        photos: uploadedPhotos,
        location: locationPoint,
        city: data.city,
        country: data.country,
        verified: false,
        last_active_at: new Date().toISOString(),
      });

      if (error) {
        alert(error.message);
        return;
      }

      // Save intent questions via edge function
      if (data.intentQuestions && data.intentQuestions.length >= 3) {
        try {
          await supabase.functions.invoke("save-intent-questions", {
            body: {
              questions: data.intentQuestions.map((q: any) => ({
                question_text: q.question_text,
                is_from_library: q.is_from_library,
                library_question_id: q.library_question_id,
                display_order: q.display_order,
              })),
            },
          });
        } catch (intentError) {
          console.error("Error saving intent questions:", intentError);
        }
      }

      // Create default preferences
      const { error: prefsError } = await supabase
        .from("user_preferences")
        .upsert(
          {
            user_id: user.id,
            location_enabled: false,
            location_filter_type: "distance",
            search_radius_miles: 50,
            search_location: null,
            search_country: null,
            age_min: null,
            age_max: null,
            height_min_cm: null,
            height_max_cm: null,
            ethnicity_preferences: null,
          },
          { onConflict: "user_id" }
        );

      if (prefsError) {
        console.error("Error creating default preferences:", prefsError);
      }

      // Send welcome email (non-blocking)
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          supabase.functions
            .invoke("send-welcome-email", {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            })
            .catch((error) => {
              console.error("Failed to send welcome email:", error);
            });
        }
      } catch (emailError) {
        console.error("Error calling welcome email function:", emailError);
      }

      setSaved(true);
    } catch (e: any) {
      alert(e.message || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleGoToModules = () => {
    router.replace("/(main)/profile/marriage-foundations");
  };

  const handleDeleteProfile = () => {
    Alert.alert(
      "Delete Profile",
      "Are you sure you want to delete your profile? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const {
                data: { session },
              } = await supabase.auth.getSession();
              if (!session) throw new Error("No active session");

              const { data: result, error } = await supabase.functions.invoke(
                "delete-account",
                {
                  headers: {
                    Authorization: `Bearer ${session.access_token}`,
                  },
                }
              );

              if (error) throw error;
              if (result?.error) throw new Error(result.error);

              await supabase.auth.signOut();
              router.replace("/");
            } catch (error: any) {
              console.error("Error deleting account:", error);
              Alert.alert(
                "Error",
                error.message || "Failed to delete account. Please try again."
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Show loading while saving
  if (saving) {
    return (
      <OnboardingBackground>
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" color="#B8860B" />
          <Text className="text-[#6B5D4F] text-lg mt-6">
            Setting up your profile...
          </Text>
        </View>
      </OnboardingBackground>
    );
  }

  return (
    <OnboardingBackground>
      <View className="flex-1 items-center justify-center px-6">
        {/* Card */}
        <View style={{
          width: '100%',
          borderRadius: 28,
          shadowColor: "#B8860B",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.35,
          shadowRadius: 30,
          elevation: 20,
        }}>
          <LinearGradient
            colors={["rgba(212,160,23,0.5)", "rgba(184,134,11,0.2)", "rgba(150,112,10,0.5)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 28, padding: 1.5 }}
          >
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 26.5, overflow: 'hidden' }}>
              {/* Top decorative line */}
              <LinearGradient
                colors={["transparent", "#D4A017", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 2 }}
              />

              <View style={{ padding: 32, paddingTop: 28 }}>
                {/* Logo */}
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <Logo variant="transparent" width={130} height={130} />
                </View>

                {/* Title */}
                <Text style={{ color: '#1C1208', fontSize: 27, fontWeight: '900', textAlign: 'center', marginBottom: 6, letterSpacing: -0.5 }}>
                  Welcome to Ikhtiar
                </Text>

                {/* Divider */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(184,134,11,0.25)' }} />
                  <Text style={{ color: '#B8860B', fontSize: 10, fontWeight: '700', letterSpacing: 2.5, marginHorizontal: 10 }}>YOUR JOURNEY BEGINS</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(184,134,11,0.25)' }} />
                </View>

                {/* Message */}
                <Text style={{ color: '#6B5D4F', fontSize: 14.5, textAlign: 'center', lineHeight: 22, marginBottom: 26 }}>
                  Ikhtiar is focused on getting you married and it is all free. Go through the following small series of modules to set your requirements and obligations for your prospective spouse & learn the Islamic significance of marriage.
                </Text>

                {/* Buttons */}
                <View style={{ gap: 12, marginTop: 4 }}>

                  {/* Primary — Start My Journey */}
                  <Pressable
                    onPress={handleGoToModules}
                    style={({ pressed }) => ({
                      borderRadius: 999,
                      overflow: 'hidden',
                      shadowColor: '#C9980A',
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: pressed ? 0.25 : 0.5,
                      shadowRadius: 18,
                      elevation: 12,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    })}
                  >
                    <BlurView intensity={70} tint="light" style={{ borderRadius: 999, overflow: 'hidden' }}>
                      <LinearGradient
                        colors={["rgba(232,184,32,0.82)", "rgba(184,134,11,0.88)", "rgba(140,98,6,0.82)"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          paddingVertical: 18,
                          paddingHorizontal: 24,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: 'rgba(255,240,180,0.45)',
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.4 }}>
                          Start My Journey
                        </Text>
                      </LinearGradient>
                    </BlurView>
                  </Pressable>

                  {/* Secondary — Delete */}
                  <Pressable
                    onPress={handleDeleteProfile}
                    disabled={deleting}
                    style={({ pressed }) => ({
                      borderRadius: 999,
                      overflow: 'hidden',
                      shadowColor: '#C0392B',
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: pressed ? 0.15 : 0.3,
                      shadowRadius: 14,
                      elevation: 8,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    })}
                  >
                    <BlurView intensity={60} tint="light" style={{ borderRadius: 999, overflow: 'hidden' }}>
                      <LinearGradient
                        colors={["rgba(220,80,70,0.78)", "rgba(180,42,34,0.88)", "rgba(145,30,24,0.82)"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          paddingVertical: 16,
                          paddingHorizontal: 24,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: 'rgba(255,180,170,0.3)',
                        }}
                      >
                        {deleting ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '700', letterSpacing: 0.2, textAlign: 'center' }}>
                            Delete my profile, I will go to some swiping app to date
                          </Text>
                        )}
                      </LinearGradient>
                    </BlurView>
                  </Pressable>

                </View>
              </View>

              {/* Bottom decorative line */}
              <LinearGradient
                colors={["transparent", "rgba(212,160,23,0.3)", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 1 }}
              />
            </View>
          </LinearGradient>
        </View>
      </View>
    </OnboardingBackground>
  );
}
