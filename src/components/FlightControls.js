// src/components/FlightControls.js
import React, { useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Define colors for clarity and consistency
const COLOR_CONNECTED_GREEN = '#10b981'; // Emerald 500
const COLOR_CONNECTED_GREEN_LIGHT = '#34d399'; // Emerald 400 (for icon)
const COLOR_CONNECTED_GREEN_BORDER = 'rgba(16, 185, 129, 0.5)';

const COLOR_CONNECTED_BLUE = '#0ea5e9'; // Sky 500
const COLOR_CONNECTED_BLUE_LIGHT = '#38bdf8'; // Sky 400 (for icon)
const COLOR_CONNECTED_BLUE_BORDER = 'rgba(14, 165, 233, 0.5)';

const COLOR_CONNECTED_RED = '#ef4444'; // Red 500
const COLOR_CONNECTED_RED_LIGHT = '#f87171'; // Red 400 (for icon)
const COLOR_CONNECTED_RED_BORDER = 'rgba(239, 68, 68, 0.5)';

const COLOR_DISABLED_ICON = '#9ca3af'; // Gray 400
const COLOR_DISABLED_BORDER = 'rgba(107, 114, 128, 0.3)'; // Gray 500 transparent

const FlightControls = ({ isConnected, onTakeoff, onLand, onEmergency }) => {
  // Animation setup for the emergency button pulse
  const emergencyPulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation;
    if (isConnected) {
      // Only run animation when connected
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(emergencyPulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(emergencyPulseAnim, {
            toValue: 0.4, // Don't fade out completely, just pulse
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    }

    // Stop the animation if disconnected or on unmount
    return () => {
      if (animation) {
        animation.stop();
        emergencyPulseAnim.setValue(1); // Reset opacity to default when stopping
      }
    };
  }, [isConnected, emergencyPulseAnim]); // Rerun effect if isConnected changes

  // Interpolate opacity for the emergency icon pulse
  const emergencyOpacity = isConnected ? emergencyPulseAnim : 1; // Apply animation only when connected

  return (
    <View style={styles.container}>
      {/* Takeoff button */}
      <Pressable
        onPress={onTakeoff}
        disabled={!isConnected}
        style={({ pressed }) => [
          styles.buttonBase,
          {
            borderColor: isConnected ? COLOR_CONNECTED_GREEN_BORDER : COLOR_DISABLED_BORDER,
            opacity: isConnected ? (pressed ? 0.7 : 1) : 0.5,
          },
          // Apply transform only when interaction is possible and pressed
          isConnected && pressed && styles.buttonPressed,
        ]}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
             stroke={isConnected ? COLOR_CONNECTED_GREEN_LIGHT : COLOR_DISABLED_ICON}>
          <Path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/>
        </Svg>
      </Pressable>

      {/* Land button */}
      <Pressable
        onPress={onLand}
        disabled={!isConnected}
        style={({ pressed }) => [
          styles.buttonBase,
          {
            borderColor: isConnected ? COLOR_CONNECTED_BLUE_BORDER : COLOR_DISABLED_BORDER,
            opacity: isConnected ? (pressed ? 0.7 : 1) : 0.5,
          },
          isConnected && pressed && styles.buttonPressed,
        ]}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
             stroke={isConnected ? COLOR_CONNECTED_BLUE_LIGHT : COLOR_DISABLED_ICON}>
          <Path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
        </Svg>
      </Pressable>

      {/* Emergency button */}
      <Pressable
        onPress={onEmergency}
        disabled={!isConnected}
        style={({ pressed }) => [
          styles.buttonBase,
          {
            borderColor: isConnected ? COLOR_CONNECTED_RED_BORDER : COLOR_DISABLED_BORDER,
            opacity: isConnected ? (pressed ? 0.7 : 1) : 0.5,
          },
          isConnected && pressed && styles.buttonPressed,
        ]}
      >
        {/* Apply animated opacity to the Svg wrapper */}
        <Animated.View style={{ opacity: emergencyOpacity }}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
               stroke={isConnected ? COLOR_CONNECTED_RED_LIGHT : COLOR_DISABLED_ICON}>
            {/* Increased strokeWidth slightly for emphasis */}
            <Path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
          </Svg>
        </Animated.View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    left: 0,
    zIndex: 10,
    flexDirection: 'row',
    gap: 12, // Space between buttons
  },
  buttonBase: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Slightly transparent background
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Default transition for scale/opacity (optional, helps smooth things out)
    // Note: React Native doesn't directly support CSS transitions like web.
    // Animations or direct style changes on press are typical.
  },
  buttonPressed: {
    // Scale effect when pressed (only applied when isConnected)
    transform: [{ scale: 1.08 }],
  },
  // No specific styles needed for SVGs here as stroke is passed directly
});

export default FlightControls;