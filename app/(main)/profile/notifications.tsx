import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";

export default function NotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    useEffect(() => {
        fetchNotificationSettings();
    }, []);

    const fetchNotificationSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("user_preferences")
                .select("notifications_enabled")
                .eq("user_id", user.id)
                .single();

            if (error) throw error;

            setNotificationsEnabled(data?.notifications_enabled ?? true);
        } catch (error) {
            console.error("Error fetching notification settings:", error);
            Alert.alert("Error", "Failed to load notification settings.");
        } finally {
            setLoading(false);
        }
    };

    const toggleNotifications = async () => {
        const newValue = !notificationsEnabled;
        setNotificationsEnabled(newValue);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from("user_preferences")
                .update({ notifications_enabled: newValue })
                .eq("user_id", user.id);

            if (error) throw error;
        } catch (error) {
            console.error("Error updating notifications:", error);
            Alert.alert("Error", "Failed to update notification setting.");
            // Rollback on error
            setNotificationsEnabled(!newValue);
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
        <View style={{ flex: 1, backgroundColor: "#FDFAF5", paddingTop: insets.top }}>
            {/* Header */}
            <View className="flex-row items-center px-6 py-4">
                <Pressable
                    onPress={() => router.back()}
                    className="w-10 h-10 rounded-full bg-[#F5F0E8] items-center justify-center"
                >
                    <Ionicons name="arrow-back" size={24} color="#1C1208" />
                </Pressable>
                <Text className="text-[#1C1208] text-xl font-bold ml-4">Notifications</Text>
            </View>

            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                {/* Master Toggle */}
                <Text className="text-gray-400 text-sm font-medium mb-3 mt-4">PUSH NOTIFICATIONS</Text>

                <View className="flex-row items-center justify-between py-4 px-4 bg-white rounded-2xl mb-3 border border-[#EDE5D5]">
                    <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 rounded-full items-center justify-center bg-[#B8860B]/20">
                            <Ionicons name="notifications" size={20} color="#B8860B" />
                        </View>
                        <View className="ml-3 flex-1">
                            <Text className="text-base font-medium text-[#1C1208]">Enable Notifications</Text>
                            <Text className="text-gray-400 text-sm mt-0.5">
                                Receive push notifications for likes, matches, and messages
                            </Text>
                        </View>
                    </View>
                    <Pressable
                        onPress={toggleNotifications}
                        className={`w-12 h-6 rounded-full px-1 justify-center ${notificationsEnabled ? 'bg-[#B8860B]' : 'bg-gray-600'
                            }`}
                    >
                        <View className={`w-4 h-4 rounded-full bg-white transition-all ${notificationsEnabled ? 'ml-6' : 'ml-0'}`} />
                    </Pressable>
                </View>

                {/* Info Section */}
                <View className="mt-8 p-4 bg-[#F5F0E8] rounded-2xl border border-[#EDE5D5]">
                    <View className="flex-row items-start">
                        <Ionicons name="information-circle" size={20} color="#B8860B" />
                        <Text className="text-gray-400 text-sm ml-2 flex-1 leading-5">
                            Disabling notifications will prevent you from receiving push alerts for all activities. You can still see updates in the app.
                        </Text>
                    </View>
                </View>

                <View className="h-8" />
            </ScrollView>
        </View>
    );
}
