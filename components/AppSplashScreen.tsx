import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export default function AppSplashScreen() {
  const [isArabic, setIsArabic] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Bouncing dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;

    // Alternate between English and Arabic
    const bounce = () => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.65, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        if (!mounted) return;
        setIsArabic((prev) => !prev);
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(scale, {
            toValue: 1,
            friction: 4,
            tension: 90,
            useNativeDriver: true,
          }),
        ]).start();
      });
    };

    const interval = setInterval(bounce, 1800);

    // Staggered bouncing dots
    const dotLoop = Animated.loop(
      Animated.stagger(180, [
        Animated.sequence([
          Animated.timing(dot1, { toValue: -8, duration: 300, useNativeDriver: true }),
          Animated.timing(dot1, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dot2, { toValue: -8, duration: 300, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dot3, { toValue: -8, duration: 300, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ])
    );
    dotLoop.start();

    return () => {
      mounted = false;
      clearInterval(interval);
      dotLoop.stop();
    };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={["#FFF2B8", "#FDF8EE", "#FDFAF5"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle top accent line */}
      <LinearGradient
        colors={["transparent", "#B8860B", "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.topLine}
      />

      <View style={styles.center}>
        {/* Language label */}
        <Text style={styles.langLabel}>{isArabic ? "English" : "عربي"}</Text>

        {/* Animated name */}
        <Animated.Text
          style={[
            isArabic ? styles.arabicText : styles.englishText,
            { opacity, transform: [{ scale }] },
          ]}
        >
          {isArabic ? "اختيار" : "Ikhtiar"}
        </Animated.Text>

        {/* Tagline */}
        <Text style={styles.tagline}>Where intention meets destiny</Text>

        {/* Bouncing dots */}
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
        </View>
      </View>

      {/* Bottom accent line */}
      <LinearGradient
        colors={["transparent", "#B8860B", "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.bottomLine}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  langLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(184,134,11,0.5)",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  englishText: {
    fontFamily: "GreatVibes-Regular",
    fontSize: 82,
    color: "#1C1208",
    textShadowColor: "#1C1208",
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 0.5,
  },
  arabicText: {
    fontSize: 72,
    fontWeight: "700",
    color: "#1C1208",
    writingDirection: "rtl",
  },
  tagline: {
    fontSize: 13,
    color: "#9E8E7E",
    fontStyle: "italic",
    letterSpacing: 0.3,
    marginTop: 4,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 32,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#B8860B",
    opacity: 0.7,
  },
  topLine: {
    position: "absolute",
    top: 72,
    left: 40,
    right: 40,
    height: 1,
    opacity: 0.35,
  },
  bottomLine: {
    position: "absolute",
    bottom: 72,
    left: 40,
    right: 40,
    height: 1,
    opacity: 0.35,
  },
});
