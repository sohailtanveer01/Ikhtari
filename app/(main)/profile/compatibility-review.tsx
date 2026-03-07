import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EXPECTATIONS_CONFIG } from "@/constants/expectationsConfig";
import { computeCompatibility } from "@/lib/compatibility";
import { useCertification } from "@/lib/hooks/useCertification";
import { useExpectations } from "@/lib/hooks/useExpectations";
import { useDiscoverStore } from "@/lib/stores/discoverStore";
import { useInterestStore } from "@/lib/stores/interestStore";
import { supabase } from "@/lib/supabase";

// ─── FAMILY CATEGORY ──────────────────────────────────────────────────────────
const FAMILY_FIELD_META: Record<string, { label: string; options: Record<string, string> }> = {
  family_involvement: {
    label: "Family Involvement",
    options: { high: "Very involved", moderate: "Moderate", low: "Low", none: "Minimal" },
  },
  living_with_inlaws: {
    label: "Living With In-laws",
    options: { yes: "Yes", temporary: "Temporary", no: "No", flexible: "Flexible" },
  },
  family_visits: {
    label: "Family Visits",
    options: { frequent: "Frequent", moderate: "Regular", occasional: "Occasional", rare: "Rare" },
  },
  cultural_priorities: {
    label: "Cultural Priorities",
    options: { islamic_first: "Islam first", balanced: "Balanced", cultural_first: "Culture first" },
  },
};

// ─── CATEGORY META ────────────────────────────────────────────────────────────
const CATEGORY_META: Array<{
  key: "deen" | "financial" | "lifestyle" | "family" | "mahr";
  label: string;
  icon: any;
  dbKey: string;
  configKey: string | null;
}> = [
  { key: "deen",      label: "Deen",      icon: "moon-outline",    dbKey: "religious_expectations", configKey: "religious" },
  { key: "financial", label: "Financial",  icon: "cash-outline",    dbKey: "financial_expectations", configKey: "financial" },
  { key: "lifestyle", label: "Lifestyle",  icon: "home-outline",    dbKey: "lifestyle_expectations", configKey: "lifestyle" },
  { key: "family",    label: "Family",     icon: "people-outline",  dbKey: "family_expectations",    configKey: null },
  { key: "mahr",      label: "Mahr",       icon: "gift-outline",    dbKey: "mahr_expectations",      configKey: "mahr" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getScoreColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#B8860B";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function getScoreGradient(score: number): [string, string] {
  if (score >= 80) return ["#047857", "#10B981"];
  if (score >= 60) return ["#78350F", "#B8860B"];
  if (score >= 40) return ["#B45309", "#F59E0B"];
  return ["#991B1B", "#EF4444"];
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Moderate";
  return "Needs Discussion";
}

function getFieldMatch(myVal: any, theirVal: any): "match" | "close" | "diff" {
  if (myVal === undefined || myVal === null || theirVal === undefined || theirVal === null) return "diff";
  const mine = String(myVal);
  const theirs = String(theirVal);
  if (mine === theirs) return "match";
  if (["flexible", "very_flexible"].includes(mine) || ["flexible", "very_flexible"].includes(theirs)) return "close";
  return "diff";
}

function getOptionLabel(configKey: string | null, fieldKey: string, value: any): string {
  if (value === undefined || value === null) return "—";
  const strVal = String(value);
  if (configKey) {
    const config = EXPECTATIONS_CONFIG[configKey as keyof typeof EXPECTATIONS_CONFIG];
    if (config && "fields" in config) {
      const field = (config.fields as any)[fieldKey];
      if (field?.options) {
        const opt = (field.options as any[]).find((o: any) => o.value === strVal);
        if (opt) return opt.label;
      }
    }
  } else {
    const meta = FAMILY_FIELD_META[fieldKey];
    if (meta?.options[strVal]) return meta.options[strVal];
  }
  return strVal.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getFieldLabel(configKey: string | null, fieldKey: string): string {
  if (configKey) {
    const config = EXPECTATIONS_CONFIG[configKey as keyof typeof EXPECTATIONS_CONFIG];
    if (config && "fields" in config) {
      const field = (config.fields as any)[fieldKey];
      if (field?.label) return field.label;
    }
  } else {
    return FAMILY_FIELD_META[fieldKey]?.label ?? fieldKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return fieldKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getCategoryExplanation(key: string, score: number, profileName: string): string {
  const n = profileName;
  if (key === "deen") {
    if (score >= 80) return `You and ${n} are strongly aligned in your religious values. Your shared commitment to faith means you'll naturally support each other's spiritual journey and build a home grounded in the same principles.`;
    if (score >= 60) return `You and ${n} share a broadly similar approach to faith, with some differences in specific practices. These are manageable with open, respectful conversation about how each of you lives out your deen day to day.`;
    if (score >= 40) return `Your religious expectations differ in a few meaningful areas. An honest conversation about practices and spiritual expectations will help you understand how your lives can align in marriage.`;
    return `There are notable differences in your religious expectations. Since faith is the foundation of an Islamic marriage, this is an important area to discuss deeply and sincerely before moving forward.`;
  }
  if (key === "financial") {
    if (score >= 80) return `You and ${n} are well aligned financially. Your shared expectations around provision, savings, and financial management suggest a harmonious approach to building a stable life together.`;
    if (score >= 60) return `Your financial expectations are broadly compatible, with some areas to refine together. These are very workable with honest communication and a genuine willingness to find common ground.`;
    if (score >= 40) return `Your financial expectations show some differences worth exploring. Financial clarity is a cornerstone of a stable marriage — having these conversations early prevents misunderstandings later.`;
    return `Your financial expectations differ significantly in several areas. A transparent conversation about responsibilities, income expectations, and financial management is essential before moving forward.`;
  }
  if (key === "lifestyle") {
    if (score >= 80) return `Your lifestyle preferences are a strong match. From daily routines to living arrangements and social life, you and ${n} appear to want similar things from everyday married life.`;
    if (score >= 60) return `Your lifestyles are largely compatible. A few differences in preferences can add richness to a relationship when approached with mutual respect and flexibility from both sides.`;
    if (score >= 40) return `There are some lifestyle differences between you and ${n} worth exploring. These may require flexibility from both sides, but they're navigable with goodwill and open communication.`;
    return `Your lifestyles differ in several key areas. These deserve careful and honest discussion to ensure both of you can build a shared life that feels fulfilling.`;
  }
  if (key === "family") {
    if (score >= 80) return `You and ${n} are closely aligned on family matters. Your shared vision for family involvement and cultural priorities is a strong foundation for a harmonious and connected married life.`;
    if (score >= 60) return `You share broadly similar family values with some variation in the specifics. Exploring these together will help you set clear expectations for your life as a family.`;
    if (score >= 40) return `Your family expectations show some meaningful differences. Questions around family involvement and living arrangements are important to address openly and early in your conversations.`;
    return `Your family expectations differ substantially in several areas. As family dynamics are central to married life, these deserve thorough and respectful discussion with each other and your families.`;
  }
  if (key === "mahr") {
    if (score >= 80) return `Your expectations around mahr are well aligned, reflecting a shared understanding of this important pillar of Islamic marriage. This is a positive sign of mutual respect and clarity.`;
    if (score >= 60) return `Your mahr expectations are broadly compatible. A focused conversation to align on the specifics would be straightforward and beneficial for both of you.`;
    if (score >= 40) return `There are some differences in your mahr expectations. Discussing this openly and calmly — and consulting with family or a knowledgeable scholar — can help you navigate this thoughtfully.`;
    return `Your mahr expectations differ considerably. A thorough discussion, ideally with family involvement or guidance from an Islamic scholar, is recommended before proceeding.`;
  }
  return "";
}

function getOverallSummary(score: number, profileName: string): string {
  if (score >= 80) return `You and ${profileName} are highly compatible. Your values, expectations, and life vision align closely across most areas — a promising foundation for a beautiful and blessed marriage.`;
  if (score >= 60) return `You and ${profileName} have good overall compatibility. While there are some areas of difference, the strong alignment across key areas gives you a solid foundation to build upon together.`;
  if (score >= 40) return `You and ${profileName} have moderate compatibility. Every couple has areas to work through — with open communication and genuine commitment, these differences can be navigated with grace.`;
  return `You and ${profileName} face some compatibility challenges across multiple areas. These don't make a connection impossible, but they do call for honest, thoughtful conversation about your expectations.`;
}

// ─── FIELD ROW ────────────────────────────────────────────────────────────────
function FieldRow({
  fieldKey,
  configKey,
  myData,
  theirData,
  profileName,
  isLast,
}: {
  fieldKey: string;
  configKey: string | null;
  myData: Record<string, any> | null;
  theirData: Record<string, any> | null;
  profileName: string;
  isLast: boolean;
}) {
  const myVal = myData?.[fieldKey];
  const theirVal = theirData?.[fieldKey];
  if (myVal === undefined && theirVal === undefined) return null;

  const match = getFieldMatch(myVal, theirVal);
  const fieldLabel = getFieldLabel(configKey, fieldKey);
  const myLabel = getOptionLabel(configKey, fieldKey, myVal);
  const theirLabel = getOptionLabel(configKey, fieldKey, theirVal);

  const matchColor = match === "match" ? "#10B981" : match === "close" ? "#F59E0B" : "#EF4444";
  const matchIcon: any = match === "match" ? "checkmark-circle" : match === "close" ? "remove-circle" : "close-circle";

  return (
    <View style={[styles.fieldRow, !isLast && styles.fieldRowBorder]}>
      <Text style={styles.fieldLabel}>{fieldLabel}</Text>
      <View style={styles.fieldValues}>
        <View style={styles.valueChip}>
          <Text style={styles.valueChipUser}>You</Text>
          <Text style={styles.valueChipVal} numberOfLines={1}>{myLabel}</Text>
        </View>
        <Ionicons name={matchIcon} size={20} color={matchColor} style={{ marginHorizontal: 6 }} />
        <View style={styles.valueChip}>
          <Text style={styles.valueChipUser}>{profileName}</Text>
          <Text style={styles.valueChipVal} numberOfLines={1}>{theirLabel}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── CATEGORY CARD ────────────────────────────────────────────────────────────
function CategoryCard({
  cat,
  score,
  myData,
  theirData,
  profileName,
}: {
  cat: (typeof CATEGORY_META)[0];
  score: number;
  myData: Record<string, any> | null;
  theirData: Record<string, any> | null;
  profileName: string;
}) {
  const scoreColor = getScoreColor(score);
  const gradient = getScoreGradient(score);
  const explanation = getCategoryExplanation(cat.key, score, profileName);

  let fieldKeys: string[] = [];
  if (cat.configKey) {
    const config = EXPECTATIONS_CONFIG[cat.configKey as keyof typeof EXPECTATIONS_CONFIG];
    if (config && "fields" in config) fieldKeys = Object.keys(config.fields as object);
  } else {
    fieldKeys = Object.keys(FAMILY_FIELD_META);
  }

  const hasData = myData !== null && theirData !== null && fieldKeys.length > 0;

  return (
    <View style={styles.categoryCard}>
      {/* Left accent bar */}
      <View style={[styles.catAccentBar, { backgroundColor: scoreColor }]} />

      {/* Card content */}
      <View style={styles.catContentArea}>
        {/* Header row */}
        <View style={styles.catHeader}>
          <View style={[styles.catIconCircle, { backgroundColor: scoreColor + "1A" }]}>
            <Ionicons name={cat.icon} size={18} color={scoreColor} />
          </View>
          <Text style={styles.catLabel}>{cat.label}</Text>
          <View style={styles.catScoreBlock}>
            <Text style={[styles.catScore, { color: scoreColor }]}>{score}%</Text>
            <Text style={[styles.catScoreTag, { color: scoreColor }]}>{getScoreLabel(score)}</Text>
          </View>
        </View>

        {/* Gradient progress bar */}
        <View style={styles.progressBg}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${score}%` as any }]}
          />
        </View>

        {/* Written explanation */}
        <Text style={styles.explanationText}>{explanation}</Text>

        {/* Field-by-field comparison */}
        {hasData && (
          <View style={styles.fieldTable}>
            <View style={styles.fieldTableHeader}>
              <Ionicons name="swap-horizontal-outline" size={12} color="#9E8E7E" style={{ marginRight: 6 }} />
              <Text style={styles.fieldTableTitle}>VALUES COMPARISON</Text>
            </View>
            {fieldKeys.map((fieldKey, idx) => (
              <FieldRow
                key={fieldKey}
                fieldKey={fieldKey}
                configKey={cat.configKey}
                myData={myData}
                theirData={theirData}
                profileName={profileName}
                isLast={idx === fieldKeys.length - 1}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function CompatibilityReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profileId, profileName: rawName } = useLocalSearchParams<{
    profileId: string;
    profileName: string;
  }>();
  const profileName = rawName || "them";

  const submitInterest = useInterestStore((s) => s.submitInterest);
  const respondToInterest = useInterestStore((s) => s.respondToInterest);
  const isSubmitting = useInterestStore((s) => s.isSubmitting);
  const removeProfile = useDiscoverStore((s) => s.removeProfile);

  const [myInterestStatus, setMyInterestStatus] = useState<string | null>(null);
  const [incomingInterest, setIncomingInterest] = useState<{ id: string; status: string } | null>(null);
  const [interestLoaded, setInterestLoaded] = useState(false);

  const { data: myCert, isLoading: l1 } = useCertification();
  const { data: theirCert, isLoading: l2 } = useCertification(profileId);
  const { data: myExpectations, isLoading: l3 } = useExpectations();
  const { data: theirExpectations, isLoading: l4 } = useExpectations(profileId);

  const isLoading = l1 || l2 || l3 || l4;

  useEffect(() => {
    const loadInterest = async () => {
      if (!profileId) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: mine }, { data: theirs }] = await Promise.all([
          supabase
            .from("interest_requests")
            .select("id, status")
            .eq("sender_id", user.id)
            .eq("recipient_id", profileId)
            .maybeSingle(),
          supabase
            .from("interest_requests")
            .select("id, status")
            .eq("sender_id", profileId)
            .eq("recipient_id", user.id)
            .in("status", ["pending", "awaiting_answers", "answers_submitted"])
            .maybeSingle(),
        ]);

        if (mine) setMyInterestStatus(mine.status);
        if (theirs) setIncomingInterest({ id: theirs.id, status: theirs.status });
      } catch (e) {
        console.error("Error loading interest:", e);
      } finally {
        setInterestLoaded(true);
      }
    };
    loadInterest();
  }, [profileId]);

  const handleSendInterest = async () => {
    if (!profileId || isSubmitting) return;
    const result = await submitInterest(profileId, []);
    if (result.success) {
      removeProfile(profileId);
      setMyInterestStatus("pending");
      Alert.alert("Interest Sent!", `${profileName} will be notified of your interest.`);
    } else {
      Alert.alert("Error", result.error || "Failed to send interest.");
    }
  };

  const handleAcceptIncoming = async () => {
    if (!incomingInterest || isSubmitting) return;
    const result = await respondToInterest(incomingInterest.id, "accept");
    if (result.success) {
      removeProfile(profileId);
      if (result.awaiting_answers) {
        setIncomingInterest({ id: incomingInterest.id, status: "awaiting_answers" });
        Alert.alert("Interest Accepted!", "They'll be notified to answer your questions.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        let myPhoto = "";
        let theirPhoto = "";
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const [{ data: myProfile }, { data: theirProfile }] = await Promise.all([
              supabase.from("users").select("photos").eq("id", user.id).single(),
              supabase.from("users").select("photos").eq("id", profileId).single(),
            ]);
            myPhoto = myProfile?.photos?.[0] || "";
            theirPhoto = theirProfile?.photos?.[0] || "";
          }
        } catch {}
        router.replace({
          pathname: "/(main)/matches",
          params: {
            matchId: result.match_id || "",
            otherUserName: profileName,
            otherUserPhoto: theirPhoto,
            myPhoto,
          },
        });
      }
    } else {
      Alert.alert("Error", result.error || "Failed to accept interest.");
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.push({ pathname: "/(main)/swipe/profile-view", params: { userId: profileId } });
  };

  // Standalone back button for empty/loading states
  const BackBtn = () => (
    <Pressable
      onPress={handleBack}
      style={[styles.standaloneBackBtn, { top: insets.top + 12 }]}
    >
      <Ionicons name="chevron-back" size={22} color="#1C1208" />
    </Pressable>
  );

  const renderInterestAction = () => {
    if (!interestLoaded) return <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]} />;

    if (myInterestStatus === "pending") {
      return (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.statusBadge}>
            <Ionicons name="time-outline" size={18} color="#B8860B" />
            <Text style={styles.statusBadgeText}>Interest Sent — Awaiting Response</Text>
          </View>
        </View>
      );
    }

    if (myInterestStatus === "accepted" || myInterestStatus === "answered_back") {
      return (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.statusBadge, styles.statusBadgeGreen]}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={[styles.statusBadgeText, { color: "#10B981" }]}>You're Matched — Start Chatting</Text>
          </View>
        </View>
      );
    }

    if (myInterestStatus === "declined") {
      return (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.statusBadge, styles.statusBadgeRed]}>
            <Ionicons name="close-circle" size={18} color="#EF4444" />
            <Text style={[styles.statusBadgeText, { color: "#EF4444" }]}>Not Reciprocated</Text>
          </View>
        </View>
      );
    }

    if (incomingInterest?.status === "pending") {
      return (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={[styles.interestBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={handleAcceptIncoming}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#1C1208" size="small" />
            ) : (
              <>
                <Ionicons name="heart" size={20} color="#1C1208" style={{ marginRight: 8 }} />
                <Text style={styles.interestBtnText}>Accept Their Interest</Text>
              </>
            )}
          </Pressable>
        </View>
      );
    }

    return (
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[styles.interestBtn, isSubmitting && { opacity: 0.6 }]}
          onPress={handleSendInterest}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#1C1208" size="small" />
          ) : (
            <>
              <Ionicons name="heart" size={20} color="#1C1208" style={{ marginRight: 8 }} />
              <Text style={styles.interestBtnText}>I'm Interested</Text>
            </>
          )}
        </Pressable>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FDFAF5" }}>
        <BackBtn />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#B8860B" />
          <Text style={{ color: "#9E8E7E", marginTop: 14, fontSize: 14 }}>
            Calculating compatibility...
          </Text>
        </View>
      </View>
    );
  }

  if (!myCert?.is_certified || !theirCert?.is_certified) {
    const notMe = !myCert?.is_certified;
    return (
      <View style={{ flex: 1, backgroundColor: "#FDFAF5" }}>
        <BackBtn />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 36 }}>
          <View style={styles.emptyIcon}>
            <Ionicons name="ribbon-outline" size={38} color="#B8860B" />
          </View>
          <Text style={styles.emptyTitle}>
            {notMe ? "Complete your certification" : `${profileName} isn't certified yet`}
          </Text>
          <Text style={styles.emptyBody}>
            {notMe
              ? "Complete the Marriage Foundations course to unlock compatibility insights with every profile."
              : `Compatibility unlocks once ${profileName} completes the Marriage Foundations course.`}
          </Text>
        </View>
      </View>
    );
  }

  const scores = computeCompatibility(myExpectations ?? null, theirExpectations ?? null);

  if (!scores) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FDFAF5" }}>
        <BackBtn />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 36 }}>
          <Text style={{ color: "#6B5D4F", fontSize: 15, textAlign: "center" }}>
            Could not calculate compatibility. Make sure both of you have filled out your expectations.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFAF5" }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO (full-bleed) ──────────────────────────────── */}
        <View style={styles.heroWrapper}>
          <LinearGradient
            colors={["#1C0A02", "#3D1A08", "#7A4606", "#B8860B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={[styles.heroGradient, { paddingTop: insets.top + 56 }]}
          >
            {/* Ikhtiar cursive heading */}
            <Text style={styles.heroIkhtiar}>Ikhtiar</Text>
            <Text style={styles.heroTitle}>Compatibility with {profileName}</Text>

            {/* Score ring */}
            <View style={styles.scoreRingOuter}>
              <View style={styles.scoreRingInner}>
                <Text style={styles.heroScore}>{scores.overall}%</Text>
                <Text style={styles.heroScoreLabel}>{getScoreLabel(scores.overall)}</Text>
              </View>
            </View>

            {/* Overall progress bar */}
            <View style={styles.heroProgressBg}>
              <LinearGradient
                colors={["rgba(255,208,96,0.5)", "#FFD060", "#FFC200"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.heroProgressFill, { width: `${scores.overall}%` as any }]}
              />
            </View>

            {/* Summary */}
            <Text style={styles.heroSummary}>
              {getOverallSummary(scores.overall, profileName)}
            </Text>

            {/* Mini category row */}
            <View style={styles.heroMiniRow}>
              {CATEGORY_META.map((cat) => {
                const s = scores[cat.key];
                const c = getScoreColor(s);
                return (
                  <View key={cat.key} style={styles.heroMiniItem}>
                    <Ionicons name={cat.icon} size={14} color={c} />
                    <Text style={[styles.heroMiniScore, { color: c }]}>{s}%</Text>
                    <Text style={styles.heroMiniLabel}>{cat.label}</Text>
                  </View>
                );
              })}
            </View>
          </LinearGradient>

          {/* Overlaid back button */}
          <Pressable
            onPress={handleBack}
            style={[styles.heroBackBtn, { top: insets.top + 12 }]}
          >
            <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.9)" />
          </Pressable>
        </View>

        {/* ── SECTION LABEL ─────────────────────────────────── */}
        <View style={styles.sectionLabel}>
          <View style={styles.sectionLabelLine} />
          <Text style={styles.sectionLabelText}>BREAKDOWN BY CATEGORY</Text>
          <View style={styles.sectionLabelLine} />
        </View>

        {/* ── CATEGORY CARDS ────────────────────────────────── */}
        {CATEGORY_META.map((cat) => (
          <CategoryCard
            key={cat.key}
            cat={cat}
            score={scores[cat.key]}
            myData={(myExpectations as any)?.[cat.dbKey] ?? null}
            theirData={(theirExpectations as any)?.[cat.dbKey] ?? null}
            profileName={profileName}
          />
        ))}

        {/* ── ADDITIONAL NOTES ──────────────────────────────── */}
        {!!(theirExpectations as any)?.additional_notes && (
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <Ionicons name="document-text-outline" size={15} color="#B8860B" />
              <Text style={styles.notesTitle}>{profileName}'s Additional Notes</Text>
            </View>
            <View style={styles.notesBody}>
              <Text style={styles.notesText}>{(theirExpectations as any).additional_notes}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── FLOATING BOTTOM BAR ───────────────────────────────── */}
      {renderInterestAction()}
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Empty / loading states
  standaloneBackBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(245,240,232,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(184,134,11,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(184,134,11,0.2)",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1C1208",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  emptyBody: {
    fontSize: 15,
    color: "#6B5D4F",
    textAlign: "center",
    lineHeight: 22,
  },

  // Hero
  heroWrapper: {
    overflow: "hidden",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 20,
    shadowColor: "#3D2000",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  heroGradient: {
    paddingHorizontal: 28,
    paddingBottom: 28,
    alignItems: "center",
  },
  heroIkhtiar: {
    fontFamily: "GreatVibes-Regular",
    fontSize: 62,
    color: "#FFD060",
    marginBottom: 2,
    textShadowColor: "rgba(184,134,11,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroTitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  scoreRingOuter: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: "#FFD060",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,208,96,0.06)",
    marginBottom: 24,
    shadowColor: "#FFD060",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  scoreRingInner: {
    alignItems: "center",
  },
  heroScore: {
    fontSize: 52,
    fontWeight: "900",
    color: "#FFD060",
    letterSpacing: -2,
  },
  heroScoreLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,220,100,0.75)",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: -2,
  },
  heroProgressBg: {
    height: 6,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 3,
    marginBottom: 18,
    overflow: "hidden",
  },
  heroProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  heroSummary: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 13.5,
    lineHeight: 21,
    marginBottom: 22,
    textAlign: "center",
  },
  heroMiniRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(255,220,100,0.08)",
    width: "100%",
  },
  heroMiniItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  heroMiniScore: {
    fontSize: 13,
    fontWeight: "800",
  },
  heroMiniLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.42)",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroBackBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  // Section label
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 14,
    gap: 10,
  },
  sectionLabelLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(184,134,11,0.18)",
  },
  sectionLabelText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9E8E7E",
    letterSpacing: 1.8,
  },

  // Category card (with accent bar)
  categoryCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(184,134,11,0.18)",
    shadowColor: "#B8860B",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: "hidden",
  },
  catAccentBar: {
    width: 5,
  },
  catContentArea: {
    flex: 1,
    padding: 20,
  },
  catHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  catIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  catLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1C1208",
    flex: 1,
    letterSpacing: -0.3,
  },
  catScoreBlock: {
    alignItems: "flex-end",
  },
  catScore: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  catScoreTag: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: -2,
  },

  // Progress bar
  progressBg: {
    height: 8,
    backgroundColor: "#F0EAE0",
    borderRadius: 4,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },

  // Explanation
  explanationText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#6B5D4F",
    marginBottom: 18,
  },

  // Field table
  fieldTable: {
    backgroundColor: "#F5F0E8",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(184,134,11,0.15)",
  },
  fieldTableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(184,134,11,0.12)",
  },
  fieldTableTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9E8E7E",
    letterSpacing: 1.5,
  },
  fieldRow: {
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  fieldRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(184,134,11,0.1)",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9E8E7E",
    marginBottom: 9,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  fieldValues: {
    flexDirection: "row",
    alignItems: "center",
  },
  valueChip: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(184,134,11,0.18)",
  },
  valueChipUser: {
    fontSize: 9,
    fontWeight: "800",
    color: "#B8860B",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  valueChipVal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1C1208",
  },

  // Notes
  notesCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(184,134,11,0.18)",
    shadowColor: "#B8860B",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9E8E7E",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  notesBody: {
    backgroundColor: "#F5F0E8",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(184,134,11,0.15)",
  },
  notesText: {
    fontSize: 14.5,
    lineHeight: 22,
    color: "#1C1208",
  },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: "rgba(253,250,245,0.97)",
    borderTopWidth: 1,
    borderTopColor: "rgba(184,134,11,0.2)",
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  interestBtn: {
    backgroundColor: "#B8860B",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  interestBtnText: {
    color: "#1C1208",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: "rgba(184,134,11,0.1)",
    borderWidth: 1,
    borderColor: "rgba(184,134,11,0.22)",
  },
  statusBadgeGreen: {
    backgroundColor: "rgba(16,185,129,0.1)",
    borderColor: "rgba(16,185,129,0.25)",
  },
  statusBadgeRed: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.2)",
  },
  statusBadgeText: {
    color: "#B8860B",
    fontSize: 15,
    fontWeight: "700",
  },
});
