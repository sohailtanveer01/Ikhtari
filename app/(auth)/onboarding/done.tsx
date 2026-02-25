import OnboardingBackground from "@/components/OnboardingBackground";
import { Ionicons } from "@expo/vector-icons";
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
        <View className="bg-white border border-[#B8860B]/30 rounded-3xl p-8 w-full">
          {/* Icon */}
          <View className="items-center mb-6">
            <View className="w-20 h-20 rounded-full bg-[#B8860B]/20 items-center justify-center">
              <Ionicons name="heart" size={40} color="#B8860B" />
            </View>
          </View>

          {/* Title */}
          <Text className="text-[#1C1208] text-2xl font-bold text-center mb-4">
            Welcome to Ikhtari
          </Text>

          {/* Message */}
          <Text className="text-[#6B5D4F] text-base text-center leading-6 mb-8">
            Ikhtari is focused on getting you married and it is all free. Go
            through the following small series of modules to set your
            requirements and your obligations for your prospective spouse &
            learn the Islamic significance of marriage.
          </Text>

          {/* Primary Button */}
          <Pressable
            onPress={handleGoToModules}
            className="bg-[#B8860B] p-5 rounded-2xl items-center mb-4"
            style={{
              shadowColor: "#B8860B",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Text className="text-white text-lg font-bold text-center">
              Go through modules & get ready for marriage
            </Text>
          </Pressable>

          {/* Secondary Button */}
          <Pressable
            onPress={handleDeleteProfile}
            disabled={deleting}
            className="p-4 rounded-2xl items-center border border-[#EDE5D5]"
          >
            {deleting ? (
              <ActivityIndicator color="#EF4444" />
            ) : (
              <Text className="text-red-400 text-sm font-medium text-center">
                Delete my profile, I will go to some swiping dating app
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </OnboardingBackground>
  );
}
