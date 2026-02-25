import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import IntentQuestionsSetup from "../../../components/IntentQuestionsSetup";
import { supabase } from "../../../lib/supabase";

const ETHNICITY_OPTIONS = [
  "Arab",
  "South Asian",
  "African",
  "East Asian",
  "Central Asian",
  "European",
  "North African",
  "Mixed",
  "Other",
  "Prefer not to say",
];

const NATIONALITY_OPTIONS = [
  "Afghanistan",
  "Algeria",
  "Bahrain",
  "Bangladesh",
  "Egypt",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Jordan",
  "Kazakhstan",
  "Kuwait",
  "Lebanon",
  "Libya",
  "Malaysia",
  "Morocco",
  "Nigeria",
  "Oman",
  "Pakistan",
  "Palestine",
  "Qatar",
  "Saudi Arabia",
  "Somalia",
  "Sudan",
  "Syria",
  "Tunisia",
  "Turkey",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Yemen",
  "Other",
];

export default function ProfileEditScreen() {
  const router = useRouter();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [dob, setDob] = useState("");
  const [education, setEducation] = useState("");
  const [profession, setProfession] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [nationality, setNationality] = useState("");
  const [intentQuestions, setIntentQuestions] = useState<Array<{ question_text: string; is_from_library: boolean; library_question_id?: string; display_order: number }>>([]);
  const [savingIntentQuestions, setSavingIntentQuestions] = useState(false);
  
  // Height picker state
  const [feet, setFeet] = useState("5");
  const [inches, setInches] = useState("10");
  const feetScrollRef = useRef<ScrollView>(null);
  const inchesScrollRef = useRef<ScrollView>(null);
  
  const FEET_OPTIONS = Array.from({ length: 4 }, (_, i) => (i + 4).toString()); // 4-7 feet
  const INCHES_OPTIONS = Array.from({ length: 12 }, (_, i) => i.toString()); // 0-11 inches

  // Scroll to current value when picker opens
  useEffect(() => {
    if (editingField === 'height' && feetScrollRef.current && inchesScrollRef.current) {
      // Small delay to ensure ScrollView is rendered
      setTimeout(() => {
        const feetIndex = FEET_OPTIONS.indexOf(feet);
        const inchesIndex = INCHES_OPTIONS.indexOf(inches);
        
        if (feetIndex >= 0) {
          feetScrollRef.current?.scrollTo({
            y: feetIndex * 44,
            animated: false,
          });
        }
        
        if (inchesIndex >= 0) {
          inchesScrollRef.current?.scrollTo({
            y: inchesIndex * 44,
            animated: false,
          });
        }
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingField, feet, inches]);

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      
      if (data.first_name && data.last_name) {
        setFirstName(data.first_name);
        setLastName(data.last_name);
      } else if (data.name) {
        const nameParts = data.name.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }
      
      setGender(data.gender || "");
      setHeight(data.height || "");
      
      // Parse height into feet and inches
      if (data.height) {
        const ftMatch = data.height.match(/(\d+)'(\d+)/);
        if (ftMatch) {
          setFeet(ftMatch[1]);
          setInches(ftMatch[2]);
        }
      }
      
      setMaritalStatus(data.marital_status || "");
      setHasChildren(data.has_children !== undefined ? data.has_children : null);
      setDob(data.dob || "");
      setEducation(data.education || "");
      setProfession(data.profession || "");
      setEthnicity(data.ethnicity || "");
      setNationality(data.nationality || "");

      // Fetch intent questions
      const { data: intentData } = await supabase
        .from("intent_questions")
        .select("question_text, is_from_library, library_question_id, display_order")
        .eq("user_id", user.id)
        .order("display_order", { ascending: true });

      if (intentData) {
        setIntentQuestions(intentData);
      }
    } catch (e: any) {
      console.error("Error loading profile:", e);
      Alert.alert("Error", "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const validateField = (field: string): string | null => {
    switch (field) {
      case 'name':
        const trimmedFirstName = firstName.trim();
        const trimmedLastName = lastName.trim();
        if (!trimmedFirstName || !trimmedLastName) {
          return "Both first and last name are required.";
        }
        if (trimmedFirstName.length < 2 || trimmedLastName.length < 2) {
          return "Names must be at least 2 characters.";
        }
        if (trimmedFirstName.length > 50 || trimmedLastName.length > 50) {
          return "Names must be less than 50 characters.";
        }
        if (!/^[a-zA-Z\s'-]+$/.test(trimmedFirstName) || !/^[a-zA-Z\s'-]+$/.test(trimmedLastName)) {
          return "Names can only contain letters, spaces, hyphens, and apostrophes.";
        }
        break;
      
      case 'height':
        const feetNum = parseInt(feet, 10);
        const inchesNum = parseInt(inches, 10);
        if (isNaN(feetNum) || isNaN(inchesNum)) {
          return "Please enter valid height values.";
        }
        if (feetNum < 4 || feetNum > 7) {
          return "Height must be between 4 and 7 feet.";
        }
        if (inchesNum < 0 || inchesNum > 11) {
          return "Inches must be between 0 and 11.";
        }
        break;
      
      case 'dob':
        if (!dob) {
          return "Date of birth is required.";
        }
        const dobDate = new Date(dob);
        const today = new Date();
        const age = today.getFullYear() - dobDate.getFullYear();
        const monthDiff = today.getMonth() - dobDate.getMonth();
        const dayDiff = today.getDate() - dobDate.getDate();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
        
        if (actualAge < 18) {
          return "You must be at least 18 years old.";
        }
        if (actualAge > 120) {
          return "Please enter a valid date of birth.";
        }
        if (dobDate > today) {
          return "Date of birth cannot be in the future.";
        }
        break;
      
      case 'education':
        const trimmedEducation = education.trim();
        if (trimmedEducation.length > 100) {
          return "Education must be less than 100 characters.";
        }
        break;
      
      case 'profession':
        const trimmedProfession = profession.trim();
        if (trimmedProfession.length > 100) {
          return "Profession must be less than 100 characters.";
        }
        break;
      
    }
    return null;
  };

  const handleSave = async (overrideValues?: {
    ethnicity?: string;
    nationality?: string;
    maritalStatus?: string;
    hasChildren?: boolean | null;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Validate the field being edited
      if (editingField) {
        const validationError = validateField(editingField);
        if (validationError) {
          Alert.alert("Validation Error", validationError);
          return;
        }
      }

      setSaving(true);

      // Build update payload - ONLY include fields that are being edited
      const updatePayload: any = {
        last_active_at: new Date().toISOString(),
      };

      // Only include fields that are being edited
      switch (editingField) {
        case 'name':
          updatePayload.name = `${firstName.trim()} ${lastName.trim()}`.trim();
          updatePayload.first_name = firstName.trim();
          updatePayload.last_name = lastName.trim();
          break;
        
        case 'height':
          // Combine feet and inches into height string format
          updatePayload.height = `${feet}'${inches}`;
          break;
        
        case 'dob':
          updatePayload.dob = dob;
          break;
        
        case 'maritalStatus':
          updatePayload.marital_status = overrideValues?.maritalStatus !== undefined ? overrideValues.maritalStatus : maritalStatus;
          break;
        
        case 'children':
          updatePayload.has_children = overrideValues?.hasChildren !== undefined ? overrideValues.hasChildren : hasChildren;
          break;
        
        case 'education':
          updatePayload.education = education.trim();
          break;
        
        case 'profession':
          updatePayload.profession = profession.trim();
          break;
        
        case 'ethnicity':
          updatePayload.ethnicity = (overrideValues?.ethnicity !== undefined ? overrideValues.ethnicity : ethnicity).trim();
          break;
        
        case 'nationality':
          updatePayload.nationality = (overrideValues?.nationality !== undefined ? overrideValues.nationality : nationality).trim();
          break;
        
        default:
          // If no specific field is being edited, include all fields (fallback)
          // This handles cases where overrideValues are used for quick saves
          updatePayload.name = `${firstName.trim()} ${lastName.trim()}`.trim();
          updatePayload.first_name = firstName.trim();
          updatePayload.last_name = lastName.trim();
          updatePayload.height = height.trim();
          updatePayload.marital_status = maritalStatus;
          updatePayload.has_children = hasChildren;
          updatePayload.education = education.trim();
          updatePayload.profession = profession.trim();
          updatePayload.ethnicity = (overrideValues?.ethnicity !== undefined ? overrideValues.ethnicity : ethnicity).trim();
          updatePayload.nationality = (overrideValues?.nationality !== undefined ? overrideValues.nationality : nationality).trim();
          break;
      }

      // Call Edge Function to update profile
      const { error } = await supabase.functions.invoke("edit-profile", {
        body: {
          updatePayload,
        },
      });

      if (error) {
        throw error;
      }

      setEditingField(null);
      await loadProfile();
      Alert.alert("Success", "Profile updated!");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#FDFAF5] items-center justify-center">
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FDFAF5]">
      {/* Premium Header */}
      <View className="pt-16 px-6 pb-6 bg-[#FDFAF5] border-b border-[#EDE5D5]">
        <View className="flex-row items-center justify-between mb-2">
          <Pressable
            onPress={() => {
              // Navigate back to profile page instead of using router.back()
              router.push("/(main)/profile");
            }}
            className="w-10 h-10 rounded-full items-center justify-center bg-[#F5F0E8] active:bg-[#EDE5D5]"
          >
            <Ionicons name="chevron-back" size={24} color="#1C1208" />
          </Pressable>
          <Text className="text-[#1C1208] text-2xl font-bold">Edit Profile</Text>
          <View className="w-10" />
        </View>
        <View className="h-1 w-16 bg-[#B8860B] rounded-full self-center mt-2" />
      </View>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        <View className="px-6 pt-6 pb-8">
          {/* About You Section */}
          <View className="bg-white rounded-3xl p-6 mb-6 border border-[#EDE5D5] shadow-lg">
            <View className="flex-row items-center mb-6">
              <View className="w-1 h-6 bg-[#B8860B] rounded-full mr-3" />
              <Text className="text-[#1C1208] text-xl font-bold">About You</Text>
            </View>
            
            {/* Name Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'name' ? null : 'name')}
              className="flex-row items-center justify-between py-4 border-b border-[#EDE5D5] active:bg-[#F5F0E8] rounded-lg"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                  <Text className="text-lg">👤</Text>
                </View>
                <Text className="text-[#1C1208] text-base font-medium">Name</Text>
              </View>
              {editingField === 'name' ? (
                <View className="items-end flex-1 ml-4">
                  <TextInput
                    className="bg-white border border-[#EDE5D5] text-[#1C1208] px-4 py-2.5 rounded-xl text-right min-w-[140] mb-2 focus:border-[#B8860B]"
                    placeholder="First Name"
                    placeholderTextColor="#9E8E7E"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    autoFocus
                  />
                  <TextInput
                    className="bg-white border border-[#EDE5D5] text-[#1C1208] px-4 py-2.5 rounded-xl text-right min-w-[140] focus:border-[#B8860B]"
                    placeholder="Last Name"
                    placeholderTextColor="#9E8E7E"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                  />
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-[#1C1208] text-base mr-2 font-medium">
                    {firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || "Not set"}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                </View>
              )}
            </Pressable>

            {/* Height Row */}
            <View className="py-4 border-b border-[#EDE5D5]">
              <Pressable
                onPress={() => setEditingField(editingField === 'height' ? null : 'height')}
                className="flex-row items-center justify-between"
                disabled={editingField === 'height'}
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                    <Text className="text-lg">📏</Text>
                  </View>
                  <Text className="text-[#1C1208] text-base font-medium">Height</Text>
                </View>
                {editingField !== 'height' && (
                  <View className="flex-row items-center">
                    <Text className="text-[#1C1208] text-base mr-2 font-medium">{height || "Not set"}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                  </View>
                )}
              </Pressable>
              {editingField === 'height' && (
                <View className="mt-4">
                  <View className="bg-[#F5F0E8] rounded-2xl border border-[#B8860B]/30 p-4">
                    <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-[#1C1208] text-lg font-semibold">Select Height</Text>
                      <Pressable onPress={async () => { await handleSave(); setEditingField(null); }} disabled={saving}>
                        {saving ? (
                          <ActivityIndicator color="#B8860B" size="small" />
                        ) : (
                          <Text className="text-[#B8860B] text-lg font-semibold">Done</Text>
                        )}
                      </Pressable>
                    </View>
                    <View className="flex-row items-center justify-center gap-2">
                      {/* Feet Picker */}
                      <View className="flex-1" style={{ height: 200 }}>
                        <ScrollView
                          ref={feetScrollRef}
                          showsVerticalScrollIndicator={false}
                          snapToInterval={44}
                          decelerationRate="fast"
                          scrollEventThrottle={16}
                          onMomentumScrollEnd={(e) => {
                            const offsetY = e.nativeEvent.contentOffset.y;
                            const index = Math.round(offsetY / 44);
                            const selectedFeet = FEET_OPTIONS[Math.max(0, Math.min(index, FEET_OPTIONS.length - 1))];
                            setFeet(selectedFeet);
                            setHeight(`${selectedFeet}'${inches}`);
                          }}
                          contentContainerStyle={{
                            paddingVertical: 78,
                          }}
                          nestedScrollEnabled={true}
                        >
                          {FEET_OPTIONS.map((ft) => (
                            <View
                              key={ft}
                              style={{
                                height: 44,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 21,
                                  color: '#1C1208',
                                }}
                              >
                                {ft}
                              </Text>
                            </View>
                          ))}
                        </ScrollView>
                        {/* Center indicator overlay */}
                        <View
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: 0,
                            right: 0,
                            height: 44,
                            borderTopWidth: 0.5,
                            borderBottomWidth: 0.5,
                            borderColor: '#EDE5D5',
                            marginTop: -22,
                            pointerEvents: 'none',
                          }}
                        />
                      </View>
                      
                      <Text style={{ fontSize: 21, color: '#1C1208', marginHorizontal: 8 }}>&apos;</Text>
                      
                      {/* Inches Picker */}
                      <View className="flex-1" style={{ height: 200 }}>
                        <ScrollView
                          ref={inchesScrollRef}
                          showsVerticalScrollIndicator={false}
                          snapToInterval={44}
                          decelerationRate="fast"
                          scrollEventThrottle={16}
                          onMomentumScrollEnd={(e) => {
                            const offsetY = e.nativeEvent.contentOffset.y;
                            const index = Math.round(offsetY / 44);
                            const selectedInches = INCHES_OPTIONS[Math.max(0, Math.min(index, INCHES_OPTIONS.length - 1))];
                            setInches(selectedInches);
                            setHeight(`${feet}'${selectedInches}`);
                          }}
                          contentContainerStyle={{
                            paddingVertical: 78,
                          }}
                          nestedScrollEnabled={true}
                        >
                          {INCHES_OPTIONS.map((inch) => (
                            <View
                              key={inch}
                              style={{
                                height: 44,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 21,
                                  color: '#1C1208',
                                }}
                              >
                                {inch}
                              </Text>
                            </View>
                          ))}
                        </ScrollView>
                        {/* Center indicator overlay */}
                        <View
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: 0,
                            right: 0,
                            height: 44,
                            borderTopWidth: 0.5,
                            borderBottomWidth: 0.5,
                            borderColor: '#EDE5D5',
                            marginTop: -22,
                            pointerEvents: 'none',
                          }}
                        />
                      </View>
                      
                      <Text style={{ fontSize: 21, color: '#1C1208', marginLeft: 8 }}>&quot;</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Marital Status Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'maritalStatus' ? null : 'maritalStatus')}
              className="py-4 border-b border-[#EDE5D5] active:bg-[#F5F0E8] rounded-lg"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                    <Text className="text-lg">💍</Text>
                  </View>
                  <Text className="text-[#1C1208] text-base font-medium">Marital Status</Text>
                </View>
                {editingField !== 'maritalStatus' && (
                  <View className="flex-row items-center">
                    <Text className="text-[#1C1208] text-base mr-2 capitalize font-medium">{maritalStatus || "Not set"}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                  </View>
                )}
              </View>
              {editingField === 'maritalStatus' && (
                <View className="flex-row gap-2 flex-wrap ml-13 mt-2">
                  {["single", "divorced", "widowed", "separated"].map((status) => (
                    <Pressable
                      key={status}
                      onPress={async () => {
                        setMaritalStatus(status);
                        // Save with the new value directly
                        await handleSave({ maritalStatus: status });
                        setEditingField(null);
                      }}
                      className={`px-4 py-2 rounded-full border ${
                        maritalStatus === status 
                          ? "bg-[#B8860B] border-[#B8860B]" 
                          : "bg-[#F5F0E8] border-[#EDE5D5]"
                      }`}
                    >
                      <Text className={`text-sm capitalize font-medium ${
                        maritalStatus === status ? "text-white" : "text-white/90"
                      }`}>
                        {status}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Pressable>

            {/* Children Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'children' ? null : 'children')}
              className="py-4 border-b border-[#EDE5D5] active:bg-[#F5F0E8] rounded-lg"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                    <Text className="text-lg">👶</Text>
                  </View>
                  <Text className="text-[#1C1208] text-base font-medium">Children</Text>
                </View>
                {editingField !== 'children' && (
                  <View className="flex-row items-center">
                    <Text className="text-[#1C1208] text-base mr-2 font-medium">
                      {hasChildren === null ? "Not set" : hasChildren ? "Yes" : "No"}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                  </View>
                )}
              </View>
              {editingField === 'children' && (
                <View className="flex-row gap-3 ml-13 mt-2">
                  {[
                    { value: true, label: "Yes" },
                    { value: false, label: "No" },
                  ].map((option) => (
                    <Pressable
                      key={option.label}
                      onPress={async () => {
                        setHasChildren(option.value);
                        // Save with the new value directly
                        await handleSave({ hasChildren: option.value });
                        setEditingField(null);
                      }}
                      className={`flex-1 px-4 py-2.5 rounded-xl border ${
                        hasChildren === option.value 
                          ? "bg-[#B8860B] border-[#B8860B]" 
                          : "bg-[#F5F0E8] border-[#EDE5D5]"
                      }`}
                    >
                      <Text className={`text-center text-sm font-semibold ${
                        hasChildren === option.value ? "text-white" : "text-white/90"
                      }`}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Pressable>

            {/* Date of Birth Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'dob' ? null : 'dob')}
              className="flex-row items-center justify-between py-4 active:bg-[#F5F0E8] rounded-lg"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                  <Text className="text-lg">📅</Text>
                </View>
                <Text className="text-[#1C1208] text-base font-medium">Date of Birth</Text>
              </View>
              {editingField === 'dob' ? (
                <TextInput
                  className="bg-white border border-[#EDE5D5] text-[#1C1208] px-4 py-2.5 rounded-xl text-right min-w-[140] focus:border-[#B8860B]"
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9E8E7E"
                  value={dob}
                  onChangeText={setDob}
                  autoFocus
                />
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-[#1C1208] text-base mr-2 font-medium">{dob || "Not set"}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                </View>
              )}
            </Pressable>

            {/* Save button for text inputs */}
            {(editingField === 'name' || editingField === 'dob') && (
              <View className="flex-row gap-3 mt-6">
                <Pressable
                  className="flex-1 bg-white px-4 py-3 rounded-xl border border-[#EDE5D5] active:bg-[#F5F0E8]"
                  onPress={() => {
                    setEditingField(null);
                    loadProfile();
                  }}
                >
                  <Text className="text-[#1C1208] font-semibold text-center">Cancel</Text>
                </Pressable>
                <Pressable
                  className="flex-1 bg-[#B8860B] px-4 py-3 rounded-xl active:bg-[#B8860B]/90"
                  onPress={async () => {
                    await handleSave();
                    setEditingField(null);
                  }}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#1C1208" size="small" />
                  ) : (
                    <Text className="text-[#1C1208] font-semibold text-center">Save</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>

          {/* Background Section */}
          <View className="bg-white rounded-3xl p-6 mb-6 border border-[#EDE5D5] shadow-lg">
            <View className="flex-row items-center mb-6">
              <View className="w-1 h-6 bg-[#B8860B] rounded-full mr-3" />
              <Text className="text-[#1C1208] text-xl font-bold">Background</Text>
            </View>
            
            {/* Education Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'education' ? null : 'education')}
              className="flex-row items-center justify-between py-4 border-b border-[#EDE5D5] active:bg-[#F5F0E8] rounded-lg"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                  <Text className="text-lg">🎓</Text>
                </View>
                <Text className="text-[#1C1208] text-base font-medium">Education</Text>
              </View>
              {editingField === 'education' ? (
                <View className="flex-1 ml-4">
                  <TextInput
                    className="bg-white border border-[#EDE5D5] text-[#1C1208] px-4 py-2.5 rounded-xl text-right min-w-[140] focus:border-[#B8860B]"
                    placeholder="Enter education"
                    placeholderTextColor="#9E8E7E"
                    value={education}
                    onChangeText={(text) => {
                      setEducation(text.slice(0, 100));
                    }}
                    autoCapitalize="words"
                    maxLength={100}
                    autoFocus
                  />
                  {education.length > 0 && (
                    <Text className="text-[#C9BFB5] text-xs mt-1 text-right">
                      {education.length}/100 characters
                    </Text>
                  )}
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-[#1C1208] text-base mr-2 font-medium">{education || "Not set"}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                </View>
              )}
            </Pressable>

            {/* Profession Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'profession' ? null : 'profession')}
              className="flex-row items-center justify-between py-4 active:bg-[#F5F0E8] rounded-lg"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                  <Text className="text-lg">💼</Text>
                </View>
                <Text className="text-[#1C1208] text-base font-medium">Profession</Text>
              </View>
              {editingField === 'profession' ? (
                <View className="flex-1 ml-4">
                  <TextInput
                    className="bg-white border border-[#EDE5D5] text-[#1C1208] px-4 py-2.5 rounded-xl text-right min-w-[140] focus:border-[#B8860B]"
                    placeholder="Enter profession"
                    placeholderTextColor="#9E8E7E"
                    value={profession}
                    onChangeText={(text) => {
                      setProfession(text.slice(0, 100));
                    }}
                    autoCapitalize="words"
                    maxLength={100}
                    autoFocus
                  />
                  {profession.length > 0 && (
                    <Text className="text-[#C9BFB5] text-xs mt-1 text-right">
                      {profession.length}/100 characters
                    </Text>
                  )}
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-[#1C1208] text-base mr-2 font-medium">{profession || "Not set"}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                </View>
              )}
            </Pressable>

            {/* Save button for text inputs */}
            {(editingField === 'education' || editingField === 'profession') && (
              <View className="flex-row gap-3 mt-6">
                <Pressable
                  className="flex-1 bg-white px-4 py-3 rounded-xl border border-[#EDE5D5] active:bg-[#F5F0E8]"
                  onPress={() => {
                    setEditingField(null);
                    loadProfile();
                  }}
                >
                  <Text className="text-[#1C1208] font-semibold text-center">Cancel</Text>
                </Pressable>
                <Pressable
                  className="flex-1 bg-[#B8860B] px-4 py-3 rounded-xl active:bg-[#B8860B]/90"
                  onPress={async () => {
                    await handleSave();
                    setEditingField(null);
                  }}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#1C1208" size="small" />
                  ) : (
                    <Text className="text-[#1C1208] font-semibold text-center">Save</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>

          {/* Ethnicity & Nationality Section */}
          <View className="bg-white rounded-3xl p-6 mb-6 border border-[#EDE5D5] shadow-lg">
            <View className="flex-row items-center mb-6">
              <View className="w-1 h-6 bg-[#B8860B] rounded-full mr-3" />
              <Text className="text-[#1C1208] text-xl font-bold">Ethnicity & Nationality</Text>
            </View>
            
            {/* Ethnicity Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'ethnicity' ? null : 'ethnicity')}
              className="flex-row items-center justify-between py-4 border-b border-[#EDE5D5] active:bg-[#F5F0E8] rounded-lg"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                  <Text className="text-lg">🌍</Text>
                </View>
                <Text className="text-[#1C1208] text-base font-medium">Ethnicity</Text>
              </View>
              {editingField === 'ethnicity' ? (
                <ScrollView className="max-h-64 flex-1 ml-4" showsVerticalScrollIndicator={false}>
                  {ETHNICITY_OPTIONS.map((option) => (
                    <Pressable
                      key={option}
                      onPress={async () => {
                        setEthnicity(option);
                        setEditingField(null);
                        await handleSave({ ethnicity: option });
                      }}
                      className={`px-4 py-2.5 rounded-xl mb-2 border ${
                        ethnicity === option 
                          ? "bg-[#B8860B] border-[#B8860B]" 
                          : "bg-[#F5F0E8] border-[#EDE5D5]"
                      }`}
                    >
                      <Text className={`text-sm font-medium text-center ${
                        ethnicity === option ? "text-white" : "text-white/90"
                      }`}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-[#1C1208] text-base mr-2 font-medium">{ethnicity || "Not set"}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                </View>
              )}
            </Pressable>

            {/* Nationality Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'nationality' ? null : 'nationality')}
              className="py-4 active:bg-[#F5F0E8] rounded-lg"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                    <Text className="text-lg">🏳️</Text>
                  </View>
                  <Text className="text-[#1C1208] text-base font-medium">Nationality</Text>
                </View>
                {editingField !== 'nationality' && (
                  <View className="flex-row items-center">
                    <Text className="text-[#1C1208] text-base mr-2 font-medium">{nationality || "Not set"}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                  </View>
                )}
              </View>
              {editingField === 'nationality' && (
                <ScrollView className="max-h-64 ml-13 mt-2" showsVerticalScrollIndicator={false}>
                  {NATIONALITY_OPTIONS.map((option) => (
                    <Pressable
                      key={option}
                      onPress={async () => {
                        setNationality(option);
                        setEditingField(null);
                        await handleSave({ nationality: option });
                      }}
                      className={`px-4 py-2.5 rounded-xl mb-2 border ${
                        nationality === option 
                          ? "bg-[#B8860B] border-[#B8860B]" 
                          : "bg-[#F5F0E8] border-[#EDE5D5]"
                      }`}
                    >
                      <Text className={`text-sm font-medium ${
                        nationality === option ? "text-white" : "text-white/90"
                      }`}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </Pressable>
          </View>

          {/* Intent Questions Section */}
          <View className="bg-white rounded-3xl p-6 mb-6 border border-[#EDE5D5] shadow-lg">
            <View className="flex-row items-center mb-6">
              <View className="w-1 h-6 bg-[#B8860B] rounded-full mr-3" />
              <Text className="text-[#1C1208] text-xl font-bold">Intent Questions</Text>
            </View>
            <Text className="text-[#9E8E7E] text-sm mb-4">
              These are the questions others must answer to express interest in you.
            </Text>

            {editingField === 'intentQuestions' ? (
              <View>
                <IntentQuestionsSetup
                  initialQuestions={intentQuestions}
                  onSave={async (questions) => {
                    setSavingIntentQuestions(true);
                    try {
                      const { error } = await supabase.functions.invoke("save-intent-questions", {
                        body: { questions },
                      });
                      if (error) throw error;
                      setIntentQuestions(questions);
                      setEditingField(null);
                      Alert.alert("Success", "Intent questions updated!");
                    } catch (e: any) {
                      Alert.alert("Error", e.message || "Failed to save intent questions.");
                    } finally {
                      setSavingIntentQuestions(false);
                    }
                  }}
                  onCancel={() => {
                    setEditingField(null);
                  }}
                />
                {savingIntentQuestions && (
                  <ActivityIndicator color="#B8860B" size="small" className="mt-4" />
                )}
              </View>
            ) : (
              <Pressable
                onPress={() => setEditingField('intentQuestions')}
                className="py-4 active:bg-[#F5F0E8] rounded-lg"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                      <Ionicons name="help-circle-outline" size={22} color="#B8860B" />
                    </View>
                    <Text className="text-[#1C1208] text-base font-medium">
                      {intentQuestions.length > 0 ? `${intentQuestions.length} questions set` : "No questions set"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                </View>
                {intentQuestions.length > 0 && (
                  <View className="mt-3 ml-13">
                    {intentQuestions.map((q, i) => (
                      <Text key={i} className="text-[#9E8E7E] text-sm mb-1" numberOfLines={1}>
                        {i + 1}. {q.question_text}
                      </Text>
                    ))}
                  </View>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

