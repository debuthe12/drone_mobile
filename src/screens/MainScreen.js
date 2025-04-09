// src/screens/MainScreen.js
import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, AppState } from 'react-native'; // Import AppState
import { useSelector, useDispatch } from 'react-redux';
import ErrorMessageDisplay from '../components/ErrorMessageDisplay';
import TelloVideoPlayer from '../components/TelloVideoPlayer';
import ControlButtons from '../components/ControlButtons';
import { connectAndStream, disconnect, setError } from '../store/telloSlice';
import * as orientationService from '../services/orientationService';
import * as ffmpegService from '../services/ffmpegService'; // Import ffmpegService for configure

const MainScreen = () => {
  const dispatch = useDispatch();
  const { isConnecting, isStreaming, errorMessage, videoUrl } = useSelector((state) => state.tello);

  // --- Effects ---

  // Initial setup and cleanup effect
  useEffect(() => {
    orientationService.lockLandscape();
    ffmpegService.configure(); // Configure FFmpeg logging

    // --- App State Handling (Optional but Recommended) ---
    const handleAppStateChange = (nextAppState) => {
      console.log('App State Changed:', nextAppState);
      if (nextAppState !== 'active' && isStreaming) {
        console.log('App is not active, disconnecting stream...');
        // Dispatch disconnect if the app goes to background/inactive while streaming
        dispatch(disconnect());
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    console.log("App State listener added.");

    // Cleanup function runs on unmount
    return () => {
      console.log("MainScreen unmounting. Running cleanup...");
      subscription.remove();
      console.log("App State listener removed.");
      // Dispatch disconnect on unmount *if* streaming
      // Check state directly here, as `isStreaming` from useSelector might be stale in cleanup
      // (though usually Redux updates quickly)
      // It's safer to dispatch disconnect regardless, the thunk handles checks.
       dispatch(disconnect());
    };
  }, [dispatch]); // Add dispatch dependency

  // --- Event Handlers ---
  const handleConnect = () => {
    if (!isConnecting && !isStreaming) {
      dispatch(connectAndStream()).catch(err => {
        // Catch errors specifically from the thunk promise itself if needed
        // Although extraReducers should handle rejected state
        console.error("Error dispatching connectAndStream:", err);
        dispatch(setError(`Dispatch Error: ${err.message || 'Failed to start connection'}`));
      });
    }
  };

  const handleDisconnect = () => {
     dispatch(disconnect()).catch(err => {
        console.error("Error dispatching disconnect:", err);
        dispatch(setError(`Dispatch Error: ${err.message || 'Failed to disconnect'}`));
     });
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />

      <ErrorMessageDisplay message={errorMessage} />

      <TelloVideoPlayer isStreaming={isStreaming} videoUrl={videoUrl} />

      <ControlButtons
        isConnecting={isConnecting}
        isStreaming={isStreaming}
        onConnectPress={handleConnect}
        onDisconnectPress={handleDisconnect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  // No need for content style, let video player take flex: 1
});

export default MainScreen;