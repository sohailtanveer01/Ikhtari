import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function Reactivate() {
    const { email } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const emailAddress = (email as string) || "";

    const handleReactivate = async () => {
        setLoading(true);
        try {
            // Send OTP with a special param to indicate reactivation
            const { error } = await supabase.auth.signInWithOtp({
                email: emailAddress,
                options: { shouldCreateUser: false },
            });

            if (error) {
                throw error;
            }

            // Navigate to OTP screen with isReactivating param
            router.push({
                pathname: "/(auth)/email-otp",
                params: { email: emailAddress, isReactivating: "true" }
            });
        } catch (error: any) {
            console.error("Error starting reactivation:", error);
            alert(error.message || "Failed to start reactivation flow.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={["rgba(238,189,43,0.65)", "rgba(10,10,10,0)"]}
                style={[styles.gradientBase, styles.gradientTopLeft]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                pointerEvents="none"
            />

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="pause-circle" size={80} color="#B8860B" />
                </View>

                <Text style={styles.title}>Welcome back!</Text>
                <Text style={styles.subtitle}>
                    Your account is currently deactivated. Would you like to reactivate it and pick up where you left off?
                </Text>

                <View style={styles.emailCard}>
                    <Text style={styles.emailLabel}>Account</Text>
                    <Text style={styles.emailValue}>{emailAddress}</Text>
                </View>

                <Pressable
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleReactivate}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? "Preparing..." : "Reactivate Account"}
                    </Text>
                </Pressable>

                {/* <Pressable
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>Use a different email</Text>
                </Pressable> */}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FDFAF5",
    },
    gradientBase: {
        position: "absolute",
        width: 620,
        height: 620,
        borderRadius: 310,
        opacity: 0.9,
        transform: [{ scale: 1.3 }],
        top: -260,
        left: -220,
    },
    content: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        alignItems: "center",
    },
    iconContainer: {
        marginBottom: 24,
        backgroundColor: "rgba(184, 134, 11, 0.1)",
        padding: 20,
        borderRadius: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#1C1208",
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: "#9CA3AF",
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    emailCard: {
        width: "100%",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 1,
        borderColor: "rgba(238, 189, 43, 0.2)",
        borderRadius: 16,
        padding: 20,
        marginBottom: 32,
        alignItems: "center",
    },
    emailLabel: {
        fontSize: 12,
        color: "#9CA3AF",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 4,
    },
    emailValue: {
        fontSize: 18,
        color: "#B8860B",
        fontWeight: "600",
    },
    button: {
        backgroundColor: "#B8860B",
        borderRadius: 16,
        paddingVertical: 18,
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#B8860B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1C1208",
    },
    backButton: {
        marginTop: 24,
        padding: 10,
    },
    backButtonText: {
        color: "#9CA3AF",
        fontSize: 15,
    },
});
