// src/components/StatusBox.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const StatusBox = ({ icon, value, color, bgColor = 'rgba(0, 0, 0, 0.3)' }) => {
  // Default background color if none provided

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Svg
        width={16} // Slightly smaller icon size
        height={16}
        viewBox="0 0 24 24"
        stroke={color} // Use the dynamic color for the icon stroke
        fill="none"
      >
        {/* Render the passed-in icon Path */}
        {icon}
      </Svg>
      {value !== undefined && value !== null && value !== '' && ( // Only render Text if value is valid
          <Text style={[styles.valueText, { color: color }]}>
              {value}
          </Text>
       )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5, // Adjusted padding
    paddingHorizontal: 8, // Adjusted padding
    borderRadius: 6,
    gap: 6, // Space between icon and text
    minWidth: 60, // Minimum width to prevent shrinking too much
    justifyContent: 'center', // Center content if value is short
  },
  valueText: {
    fontSize: 12, // Adjusted font size
    fontWeight: '600', // Slightly bolder
    lineHeight: 16, // Match icon height roughly
  },
});

export default StatusBox;