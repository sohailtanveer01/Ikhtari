import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { supabase } from "../../../lib/supabase";

export default function AccountInfoScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [dob, setDob] = useState("");
    const [email, setEmail] = useState("");
    const [currentEmail, setCurrentEmail] = useState("");

    useEffect(() => {
        loadAccountInfo();
    }, []);

    const loadAccountInfo = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace("/(auth)/login");
                return;
            }

            setEmail(user.email || "");
            setCurrentEmail(user.email || "");

            const { data, error } = await supabase
                .from("users")
                .select("first_name, last_name, dob, name")
                .eq("id", user.id)
                .single();

            if (error) throw error;

            if (data.first_name && data.last_name) {
                setFirstName(data.first_name);
                setLastName(data.last_name);
            } else if (data.name) {
                const nameParts = data.name.split(" ");
                setFirstName(nameParts[0] || "");
                setLastName(nameParts.slice(1).join(" ") || "");
            }

            setDob(data.dob || "");
        } catch (error) {
            console.error("Error loading account info:", error);
            Alert.alert("Error", "Failed to load account information.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        try {
            setSaving(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Update name and DOB in users table
            const updatePayload = {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                name: `${firstName.trim()} ${lastName.trim()}`.trim(),
                dob: dob.trim(),
                last_active_at: new Date().toISOString(),
            };

            const { error: profileError } = await supabase
                .from("users")
                .update(updatePayload)
                .eq("id", user.id);

            if (profileError) throw profileError;

            // Update email if it changed
            if (email.trim().toLowerCase() !== currentEmail.toLowerCase()) {
                const { error: emailError } = await supabase.auth.updateUser({
                    email: email.trim().toLowerCase(),
                });

                if (emailError) throw emailError;

                Alert.alert(
                    "Success",
                    "Profile updated. Please check your new email for a confirmation link to complete the email change.",
                    [{ text: "OK", onPress: () => router.back() }]
                );
                return;
            }

            Alert.alert("Success", "Account information updated successfully!");
            router.back();
        } catch (error: any) {
            console.error("Error updating account info:", error);
            Alert.alert("Error", error.message || "Failed to update account information.");
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
            {/* Header */}
            <View className="flex-row items-center px-6 pt-16 pb-4">
                <Pressable
                    onPress={() => router.back()}
                    className="w-10 h-10 rounded-full bg-[#F5F0E8] items-center justify-center"
                >
                    <Ionicons name="arrow-back" size={24} color="#1C1208" />
                </Pressable>
                <Text className="text-[#1C1208] text-xl font-bold ml-4">Account Information</Text>
            </View>

            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                <View className="mt-6">
                    <Text className="text-gray-400 text-sm font-medium mb-2 ml-1">NAME</Text>
                    <View className="bg-white rounded-2xl p-4 gap-4">
                        <View>
                            <Text className="text-gray-500 text-xs mb-1 ml-1">First Name</Text>
                            <TextInput
                                className="text-[#1C1208] text-base py-1"
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="First Name"
                                placeholderTextColor="#666"
                            />
                        </View>
                        <View className="h-[1px] bg-[#EDE5D5]" />
                        <View>
                            <Text className="text-gray-500 text-xs mb-1 ml-1">Last Name</Text>
                            <TextInput
                                className="text-[#1C1208] text-base py-1"
                                value={lastName}
                                onChangeText={setLastName}
                                placeholder="Last Name"
                                placeholderTextColor="#666"
                            />
                        </View>
                    </View>

                    <Text className="text-gray-400 text-sm font-medium mb-2 mt-6 ml-1">DATE OF BIRTH</Text>
                    <View className="bg-white rounded-2xl p-4">
                        <TextInput
                            className="text-[#1C1208] text-base py-1"
                            value={dob}
                            onChangeText={setDob}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#666"
                        />
                    </View>
                    <Text className="text-gray-500 text-xs mt-2 ml-1">Format: YYYY-MM-DD</Text>

                    <Text className="text-gray-400 text-sm font-medium mb-2 mt-6 ml-1">EMAIL ADDRESS</Text>
                    <View className="bg-white rounded-2xl p-4">
                        <TextInput
                            className="text-[#1C1208] text-base py-1"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Email Address"
                            placeholderTextColor="#666"
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>
                    <Text className="text-gray-500 text-xs mt-2 ml-1">
                        Changing your email will require verification.
                    </Text>

                    <Pressable
                        onPress={handleUpdateProfile}
                        disabled={saving}
                        className={`mt-10 h-14 rounded-2xl items-center justify-center ${saving ? 'bg-[#B8860B]/50' : 'bg-[#B8860B]'}`}
                    >
                        {saving ? (
                            <ActivityIndicator color="#1C1208" />
                        ) : (
                            <Text className="text-[#1C1208] text-lg font-bold">Save Changes</Text>
                        )}
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}
