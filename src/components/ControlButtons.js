// src/components/ControlButtons.js
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

const ControlButtons = ({ isConnecting, isStreaming, onConnectPress, onDisconnectPress }) => {
  return (
    <View style={styles.buttonContainer}>
      {isConnecting ? (
         <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Connecting...</Text>
         </View>
      ) : !isStreaming ? (
        <TouchableOpacity
          style={styles.button}
          onPress={onConnectPress}
          disabled={isConnecting} // Disable while connecting
        >
          <Text style={styles.buttonText}>Start Stream</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.disconnectButton]}
          onPress={onDisconnectPress}
          disabled={isConnecting} // Also disable disconnect if somehow connecting state is true
        >
          <Text style={styles.buttonText}>Disconnect</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    position: 'absolute',
    bottom: 30, // Increased bottom spacing
    left: 20,
    right: 20,
    zIndex: 5,
    alignItems: 'center', // Center the button/loading indicator
  },
   loadingContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  button: {
    backgroundColor: 'rgba(33, 150, 243, 0.8)',
    paddingVertical: 15, // Slightly larger buttons
    paddingHorizontal: 40,
    borderRadius: 25, // More rounded
    alignItems: 'center',
    shadowColor: "#000", // Add shadow for better visibility
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disconnectButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ControlButtons;