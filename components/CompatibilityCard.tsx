import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { EXPECTATIONS_CONFIG } from "@/constants/expectationsConfig";
import { computeCompatibility, type CompatibilityScores } from "@/lib/compatibility";
import { useCertification } from "@/lib/hooks/useCertification";
import { useExpectations } from "@/lib/hooks/useExpectations";

interface CompatibilityCardProps {
  profileId: string;
  profileName: string;
}

const CATEGORY_META = [
  { key: "deen" as const, label: "Deen", icon: "moon-outline", configKey: "religious" },
  { key: "financial" as const, label: "Financial", icon: "cash-outline", configKey: "financial" },
  { key: "lifestyle" as const, label: "Lifestyle", icon: "home-outline", configKey: "lifestyle" },
  { key: "family" as const, label: "Family", icon: "people-outline", configKey: "family" },
  { key: "mahr" as const, label: "Mahr", icon: "gift-outline", configKey: "mahr" },
] as const;

function getOptionLabel(configKey: string, fieldKey: string, value: any): string {
  const config = EXPECTATIONS_CONFIG[configKey as keyof typeof EXPECTATIONS_CONFIG];
  if (!config || !("fields" in config)) return String(value);
  const field = (config.fields as any)[fieldKey];
  if (!field) return String(value);
  if ("options" in field) {
    const opt = field.options.find((o: any) => o.value === String(value));
    return opt?.label || String(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function ProgressBar({ value, color = "#B8860B" }: { value: number; color?: string }) {
  return (
    <View className="h-2 bg-[#F5F0E8] rounded-full overflow-hidden flex-1 ml-2">
      <View
        className="h-full rounded-full"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </View>
  );
}

function ExpectationsSection({
  title,
  configKey,
  data,
}: {
  title: string;
  configKey: string;
  data: Record<string, any> | null;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!data || Object.keys(data).length === 0) return null;

  const dbKey = configKey === "religious"
    ? "religious"
    : configKey;

  return (
    <View className="mt-3">
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between py-2"
      >
        <Text className="text-[#6B5D4F] text-sm font-semibold">{title}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color="#9E8E7E"
        />
      </Pressable>
      {expanded && (
        <View className="bg-[#F5F0E8] rounded-xl p-3 mt-1">
          {Object.entries(data).map(([key, value]) => (
            <View key={key} className="flex-row justify-between py-1.5">
              <Text className="text-[#9E8E7E] text-xs flex-1">
                {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
              <Text className="text-[#1C1208] text-xs font-semibold ml-2">
                {getOptionLabel(configKey, key, value)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function CompatibilityCard({
  profileId,
  profileName,
}: CompatibilityCardProps) {
  const { data: myCert } = useCertification();
  const { data: theirCert } = useCertification(profileId);
  const { data: myExpectations } = useExpectations();
  const { data: theirExpectations } = useExpectations(profileId);

  // Only render if both users are certified
  if (!myCert?.is_certified || !theirCert?.is_certified) return null;
  if (!myExpectations || !theirExpectations) return null;

  const scores = computeCompatibility(myExpectations, theirExpectations);
  if (!scores) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#10B981";
    if (score >= 60) return "#B8860B";
    if (score >= 40) return "#F59E0B";
    return "#EF4444";
  };

  // Map configKey to DB column key for expectations data
  const getExpectationsData = (configKey: string) => {
    const dbKeyMap: Record<string, string> = {
      religious: "religious_expectations",
      financial: "financial_expectations",
      lifestyle: "lifestyle_expectations",
      family: "family_expectations",
      mahr: "mahr_expectations",
    };
    const dbKey = dbKeyMap[configKey];
    return dbKey ? theirExpectations[dbKey] : null;
  };

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 20,
        marginHorizontal: 20,
        marginTop: 24,
        borderWidth: 1,
        borderColor: "#EDE5D5",
        shadowColor: "#B8860B",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      {/* Header */}
      <Text
        style={{
          fontSize: 12,
          fontWeight: "800",
          color: "#9E8E7E",
          marginBottom: 16,
          textTransform: "uppercase",
          letterSpacing: 2,
        }}
      >
        Compatibility
      </Text>

      {/* Overall Score */}
      <View className="items-center mb-5">
        <Text
          style={{
            fontSize: 48,
            fontWeight: "900",
            color: getScoreColor(scores.overall),
          }}
        >
          {scores.overall}%
        </Text>
        <Text className="text-[#6B5D4F] text-sm">
          Overall compatibility with {profileName}
        </Text>
      </View>

      {/* Category Breakdown */}
      {CATEGORY_META.map((cat) => {
        const score = scores[cat.key];
        return (
          <View key={cat.key} className="mb-3">
            <View className="flex-row items-center">
              <Ionicons name={cat.icon as any} size={16} color="#B8860B" />
              <Text className="text-[#1C1208] text-sm font-semibold ml-2 w-20">
                {cat.label}
              </Text>
              <ProgressBar value={score} color={getScoreColor(score)} />
              <Text
                className="text-sm font-bold ml-2"
                style={{ color: getScoreColor(score), minWidth: 36, textAlign: "right" }}
              >
                {score}%
              </Text>
            </View>

            {/* Expandable expectations view */}
            <ExpectationsSection
              title={`${profileName}'s ${cat.label} Expectations`}
              configKey={cat.configKey}
              data={getExpectationsData(cat.configKey)}
            />
          </View>
        );
      })}
    </View>
  );
}
