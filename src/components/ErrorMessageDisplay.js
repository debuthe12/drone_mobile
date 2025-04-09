// src/components/ErrorMessageDisplay.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ErrorMessageDisplay = ({ message }) => {
  if (!message) {
    return null;
  }

  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    backgroundColor: 'rgba(255, 205, 210, 0.9)',
    padding: 10,
    margin: 10,
    borderRadius: 5,
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 10,
    elevation: 10, // for Android shadow
  },
  errorText: {
    color: '#b71c1c',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default ErrorMessageDisplay;