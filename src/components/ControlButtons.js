// src/components/ControlButtons.js
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Define colors for consistency
const connectedColor = '#10b981'; // Emerald-500
const disconnectedColor = '#ef4444'; // Red-500 (changed from #ff0000 for slightly better look)
const textColor = '#FFFFFF'; // White

const ControlButtons = ({ isConnected, isConnecting, onConnectPress, onDisconnectPress }) => {
  // Animation setup for the pulsing dot
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Configure the pulsing animation loop
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000, // Duration of pulse out
          useNativeDriver: true, // Use native driver for performance
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2000, // Duration of pulse in
          useNativeDriver: true,
        }),
      ])
    );

    // Start the animation
    animation.start();

    // Stop the animation on component unmount
    return () => {
      animation.stop();
      pulseAnim.setValue(0); // Reset value on cleanup
    };
  }, [pulseAnim]); // Only run effect once on mount

  // Interpolate the animated value to scale and opacity
  const scale = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.8, 1], // Scale out and back
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 1, 0.5], // Fade in and out
  });

  // Determine current status color and text
  const statusColor = isConnected ? connectedColor : disconnectedColor;
  const statusText = isConnected ? 'Connected' : 'Connect';

  // Determine the correct press handler based on connection state
  const handlePress = () => {
    if (isConnected) {
      onDisconnectPress();
    } else {
      onConnectPress();
    }
  };

  return (
    // Container View to center the button(s) horizontally if needed later
    <View style={styles.outerContainer}>
       {/* Single Pressable Connect/Disconnect Button */}
      <Pressable
        onPress={handlePress}
        // Disable the button while connecting to prevent multiple clicks
        disabled={isConnecting}
        style={({ pressed }) => [
          styles.pressable,
          // Apply reduced opacity if connecting or pressed
          (pressed || isConnecting) && styles.pressed,
        ]}
      >
        {/* Status Indicator Dot */}
        <View style={styles.dotContainer}>
           {/* Animated Pulsing Outer Dot */}
          <Animated.View
            style={[
              styles.dotAnimated,
              { backgroundColor: statusColor, opacity, transform: [{ scale }] }
            ]}
          />
           {/* Static Inner Dot */}
          <View
            style={[
              styles.dotStatic,
              { backgroundColor: statusColor }
            ]}
          />
        </View>

        {/* Lightning Bolt Icon */}
        <Svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          stroke={textColor} // Use defined text color
          fill="none"
        >
          <Path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5} // Slightly thicker stroke
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </Svg>

        {/* Status Text */}
        <Text style={styles.text}>
          {/* Show "Connecting..." if the connection is in progress */}
          {isConnecting ? 'Connecting...' : statusText}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    height:20,
    width:70,
    top: 15,
    left: -50, // Align to left
    right: 10, // Align to right
    alignItems: 'center', // Center children horizontally
    zIndex: 5,
  },
  pressable: {
    paddingVertical: 8, // Increased vertical padding
    paddingHorizontal: 12, // Increased horizontal padding
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black background
    borderRadius: 9999, // Fully rounded ends
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // Increased gap
    borderWidth: 1, // Add a subtle border
    borderColor: 'rgba(255, 255, 255, 0.3)', // White border with low opacity
  },
  pressed: {
    opacity: 0.7, // Opacity change when pressed or connecting
  },
  dotContainer: {
    width: 1,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotAnimated: {
    position: 'absolute', // Position underneath the static dot
    width: 8, // Size of the animated part
    height: 8,
    borderRadius: 4,
    // Background color, opacity, and transform are applied dynamically
  },
  dotStatic: {
    width: 5, // Slightly larger inner dot
    height: 5,
    borderRadius: 2.5,
    // Background color applied dynamically
  },
  text: {
    color: textColor,
    fontSize: 8, // Slightly larger text
    fontWeight: '600', // Slightly bolder
    marginLeft: -2, // Adjust spacing slightly after icon
  },
});

export default ControlButtons;