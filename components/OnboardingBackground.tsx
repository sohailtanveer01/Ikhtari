import { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface OnboardingBackgroundProps {
  children: ReactNode;
}

export default function OnboardingBackground({ children }: OnboardingBackgroundProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["rgba(184,134,11,0.18)", "rgba(253,250,245,0)"]}
        style={[styles.gradientBase, styles.gradientTopLeft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(253,250,245,0)", "rgba(184,134,11,0.12)"]}
        style={[styles.gradientBase, styles.gradientBottomRight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />
      {/* Logo at top */}
      {/* <View style={styles.logoContainer}>
        <Logo variant="colored" width={120} />
      </View> */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFAF5",
    position: "relative",
  },
  gradientBase: {
    position: "absolute",
    width: 620,
    height: 620,
    borderRadius: 310,
    opacity: 0.9,
    transform: [{ scale: 1.3 }],
  },
  gradientTopLeft: {
    top: -260,
    left: -220,
  },
  gradientBottomRight: {
    bottom: -260,
    right: -220,
  },
  // logoContainer: {
  //   position: "absolute",
  //   top: 60,
  //   left: 0,
  //   right: 0,
  //   alignItems: "center",
  //   zIndex: 10,
  // },
});

