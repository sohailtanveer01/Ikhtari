import { Image, StyleSheet } from "react-native";

/**
 * Reusable Logo component
 * @param {Object} props
 * @param {'transparent' | 'colored'} props.variant - Logo variant to use
 * @param {number} props.width - Logo width (default: 120)
 * @param {number} props.height - Logo height (default: auto, maintains aspect ratio)
 * @param {string} props.style - Additional styles
 */
export default function Logo({ 
  variant = 'colored', 
  width = 120, 
  height,
  style 
}) {
  const logoSource = variant === 'new-big-transparent'
    ? require('../assets/Logos/new-big-transparent (1).png')
    : variant === 'new-transparent'
    ? require('../assets/Logos/new-transparent-logo.png')
    : variant === 'transparent'
    ? require('../assets/Logos/transparent-logo.png')
    : require('../assets/Logos/colored-logo.png');

  // Maintain aspect ratio if height not specified
  const aspectRatio = 1; // Adjust this based on your logo's actual aspect ratio
  const logoHeight = height || width * aspectRatio;

  return (
    <Image
      source={logoSource}
      style={[
        {
          width,
          height: logoHeight,
          resizeMode: 'contain',
        },
        style,
      ]}
    />
  );
}

