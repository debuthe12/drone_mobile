// src/components/MediaControls.js
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Re-using colors defined previously, add if missing
const COLOR_CONNECTED_GREEN_LIGHT = '#34d399'; // Emerald 400
const COLOR_CONNECTED_GREEN_BORDER = 'rgba(16, 185, 129, 0.5)';

const COLOR_CONNECTED_BLUE_LIGHT = '#38bdf8'; // Sky 400
const COLOR_CONNECTED_BLUE_BORDER = 'rgba(14, 165, 233, 0.5)';

const COLOR_CONNECTED_RED_LIGHT = '#f87171'; // Red 400
const COLOR_CONNECTED_RED_BORDER = 'rgba(239, 68, 68, 0.5)';

const COLOR_DISABLED_ICON = '#9ca3af'; // Gray 400
const COLOR_DISABLED_BORDER = 'rgba(107, 114, 128, 0.3)'; // Gray 500 transparent
const COLOR_TEXT_LIGHT = '#FFFFFF';


const MediaControls = ({ isEnabled, isRecording, onCapturePress, onRecordTogglePress }) => {

  const recordButtonBorderColor = isEnabled
    ? isRecording
      ? COLOR_CONNECTED_RED_BORDER
      : COLOR_CONNECTED_BLUE_BORDER
    : COLOR_DISABLED_BORDER;

  const recordButtonIconColor = isEnabled
    ? isRecording
      ? COLOR_CONNECTED_RED_LIGHT
      : COLOR_CONNECTED_BLUE_LIGHT
    : COLOR_DISABLED_ICON;

  return (
    <View style={styles.container}>
      {/* Capture button */}
      <Pressable
        onPress={onCapturePress}
        disabled={!isEnabled}
        style={({ pressed }) => [
            styles.buttonBase,
            {
                borderColor: isEnabled ? COLOR_CONNECTED_GREEN_BORDER : COLOR_DISABLED_BORDER,
                opacity: isEnabled ? (pressed ? 0.7 : 1) : 0.5,
            }
        ]}
      >
        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none"
             stroke={isEnabled ? COLOR_CONNECTED_GREEN_LIGHT : COLOR_DISABLED_ICON}>
          <Path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
          <Path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
        </Svg>
        <Text style={styles.buttonText}>
          Capture
        </Text>
      </Pressable>

      {/* Record/Stop button */}
      <Pressable
        onPress={onRecordTogglePress}
        disabled={!isEnabled}
        style={({ pressed }) => [
            styles.buttonBase,
            {
                borderColor: recordButtonBorderColor,
                opacity: isEnabled ? (pressed ? 0.7 : 1) : 0.5,
            }
        ]}
      >
        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none"
             stroke={recordButtonIconColor}>
          {isRecording ? (
             // Stop/Pause Icon Path
            <Path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M10 9v6m4-6v6"/>
          ) : (
             // Record Icon Path
            <Path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          )}
        </Svg>
        <Text style={styles.buttonText}>
          {isRecording ? 'Stop' : 'Record'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  // --- UPDATED CONTAINER STYLE ---
  container: {
    position: 'absolute',
    // Position below the FlightControls row (FlightControls at top: 20, height ~40)
    top: 20, // (20 + 40 + gap 10) - Adjust as needed
    // Align left edge with the FlightControls container
    right:0,
    zIndex: 25,
    flexDirection: 'row', // Arrange buttons side-by-side HORIZONTALLY
    gap: 10, // Horizontal space between buttons
    // No alignItems needed if buttons are same height. Can add 'center' if needed.
  },
  // --- Base style for buttons (No changes needed from previous vertical version) ---
  buttonBase: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 9999,
    flexDirection: 'row', // Icon and text side-by-side *within* the button
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    // Removing minWidth as it might not be desired for horizontal layout
    // minWidth: 90,
    justifyContent: 'center', // Center content within the button now
  },
  buttonText: {
    color: COLOR_TEXT_LIGHT,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
  },
});

export default MediaControls;