import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface MarriageFoundationsBadgeProps {
  size?: "small" | "medium" | "large";
  showText?: boolean;
  certifiedDate?: string | null;
}

export function MarriageFoundationsBadge({
  size = "medium",
  showText = true,
  certifiedDate,
}: MarriageFoundationsBadgeProps) {
  const sizeStyles = {
    small: {
      icon: 12,
      text: 8,
      padding: 4,
      borderRadius: 8,
    },
    medium: {
      icon: 16,
      text: 10,
      padding: 6,
      borderRadius: 10,
    },
    large: {
      icon: 20,
      text: 12,
      padding: 8,
      borderRadius: 12,
    },
  };

  const style = sizeStyles[size];

  return (
    <View style={[styles.container, { padding: style.padding, borderRadius: style.borderRadius }]}>
      <Ionicons name="school" size={style.icon} color="#B8860B" />
      {showText && (
        <Text style={[styles.text, { fontSize: style.text }]}>
          Certified
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(184, 134, 11, 0.15)", // Gold with transparency
    borderWidth: 1,
    borderColor: "#B8860B",
    gap: 4,
  },
  text: {
    color: "#B8860B",
    fontWeight: "700",
    textTransform: "uppercase",
  },
});


