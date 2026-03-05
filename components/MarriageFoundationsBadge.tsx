import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "react-native";

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
    small:  { icon: 11, text: 8,  paddingH: 8,  paddingV: 4,  borderRadius: 10, gap: 4 },
    medium: { icon: 14, text: 10, paddingH: 10, paddingV: 5,  borderRadius: 12, gap: 5 },
    large:  { icon: 22, text: 14, paddingH: 18, paddingV: 11, borderRadius: 16, gap: 8 },
  };

  const s = sizeStyles[size];

  return (
    <LinearGradient
      colors={["rgba(212,160,23,0.22)", "rgba(184,134,11,0.1)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: s.paddingH,
        paddingVertical: s.paddingV,
        borderRadius: s.borderRadius,
        borderWidth: 1,
        borderColor: "rgba(184,134,11,0.45)",
        gap: s.gap,
      }}
    >
      <Ionicons name="ribbon" size={s.icon} color="#B8860B" />
      {showText && (
        <Text
          style={{
            color: "#B8860B",
            fontWeight: "800",
            fontSize: s.text,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          Certified
        </Text>
      )}
    </LinearGradient>
  );
}
