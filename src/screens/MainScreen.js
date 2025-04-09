// src/screens/MainScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, StatusBar, AppState, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Svg, { Path } from 'react-native-svg'; // Import Svg and Path

// Components
import ErrorMessageDisplay from '../components/ErrorMessageDisplay';
import TelloVideoPlayer from '../components/TelloVideoPlayer';
import ControlButtons from '../components/ControlButtons'; // Use renamed component
import FlightControls from '../components/FlightControls';
import StatusBox from '../components/StatusBox'; // Import StatusBox
import MediaControls from '../components/MediaControls';

// Redux and Services
import {
  connectAndStream,
  disconnect,
  setError,
  updateStatus, // Import the new action
} from '../store/telloSlice';
import * as telloService from '../services/telloService';
import * as orientationService from '../services/orientationService';
import * as ffmpegService from '../services/ffmpegService';

const MainScreen = () => {
  const dispatch = useDispatch();

  // --- Selectors ---
  const {
    isConnecting,
    isStreaming,
    errorMessage,
    videoUrl,
    battery,      // Select new state
    flightTime,   // Select new state
    lastUpdate,   // Select new state
  } = useSelector((state) => state.tello);

  const isConnected = isStreaming; // Use isStreaming as the primary connection flag

  // Local state for recording UI toggle
  const [isRecording, setIsRecording] = useState(false); // <-- Add state for recording toggle

  // --- Callback for Status Updates ---
  // Memoize the callback that will dispatch updates to Redux
  const handleStatusUpdate = useCallback((statusData) => {
    // console.log("Received Status Data:", statusData); // For debugging
    if (statusData && !statusData.error) { // Check if it's valid data and not an error object
      dispatch(updateStatus(statusData));

      // --- Optional: Handle specific updates like Wifi SNR ---
      // if (statusData.wifiSnr !== undefined) {
      //   dispatch(updateWifiSnr(statusData.wifiSnr));
      // }
    } else if (statusData?.error) {
        console.error("Status update callback received an error:", statusData.error);
        dispatch(setError(`Status Listener Error: ${statusData.error}`));
        // Consider triggering disconnect on socket error?
        // dispatch(disconnect());
    }
  }, [dispatch]); // Dependency: dispatch

  // --- Effects ---

  // Effect for Tello Service Initialization and Cleanup
  useEffect(() => {
    // Initialize the service when the component mounts, passing the callback
    console.log("MainScreen: Initializing Tello Service...");
    telloService.initialize(handleStatusUpdate)
        .then(() => console.log("MainScreen: Tello Service Initialized successfully."))
        .catch(err => {
            console.error("MainScreen: Failed to initialize Tello Service:", err);
            dispatch(setError(`Service Init Failed: ${err.message}`));
        });

    // Cleanup: Close the service when the component unmounts
    return () => {
      console.log("MainScreen: Closing Tello Service on unmount...");
      telloService.close();
    };
  }, [handleStatusUpdate, dispatch]); // Rerun if handleStatusUpdate changes (it shouldn't if dispatch is stable)

  // Effect for Orientation, FFmpeg Config, App State (Keep existing)
  useEffect(() => {
    orientationService.lockLandscape();
    ffmpegService.configure();

    const handleAppStateChange = (nextAppState) => {
      console.log('App State Changed:', nextAppState);
      if (nextAppState.match(/inactive|background/) && isStreaming) {
        console.log('App is not active, disconnecting stream...');
        dispatch(disconnect());
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    console.log("App State listener added.");

    return () => {
      console.log("MainScreen unmounting (App State Effect). Running cleanup...");
      subscription.remove();
      console.log("App State listener removed.");
      // Note: Tello Service close is handled by the other effect now.
      // Ensure FFmpeg is stopped on unmount if streaming
       if (isStreaming) {
           console.log("Stopping FFmpeg on unmount...");
           ffmpegService.stop().catch(e => console.error("Error stopping ffmpeg on unmount:", e));
       }
       orientationService.unlock(); // Ensure orientation unlocked
    };
  }, [dispatch, isStreaming]); // Add isStreaming dependency

  // --- Command Sending Handlers (Keep existing) ---
  const sendFlightCommand = useCallback(async (command) => {
    // ... (existing implementation) ...
    if (!isConnected) {
      console.warn(`Cannot send command "${command}", not connected.`);
      dispatch(setError('Cannot send command, drone not connected.'));
      return;
    }
    try {
      console.log(`Sending command: ${command}`);
      await telloService.sendCommand(command);
      console.log(`Command "${command}" sent successfully.`);
      // Optional: Clear specific errors on success
      // if (errorMessage?.startsWith(`Failed to send command "${command}"`)) {
      //    dispatch(setError(null));
      // }
    } catch (error) {
      console.error(`Failed to send command "${command}":`, error);
      dispatch(setError(`Cmd Fail: ${command}: ${error.message}`));
    }
  }, [isConnected, dispatch]); // Removed errorMessage dependency

  const handleTakeoff = useCallback(() => sendFlightCommand('takeoff'), [sendFlightCommand]);
  const handleLand = useCallback(() => sendFlightCommand('land'), [sendFlightCommand]);
  const handleEmergency = useCallback(() => {
     Alert.alert( /* ... existing confirmation ... */
        "Confirm Emergency Stop",
        "Are you sure you want to stop all motors immediately?",
        [ { text: "Cancel", style: "cancel" },
          { text: "Confirm Stop", onPress: () => sendFlightCommand('emergency'), style: "destructive" }
        ]);
  }, [sendFlightCommand]);

  // --- Connect/Disconnect Handlers (Keep existing) ---
   const handleConnect = () => {
     if (!isConnecting && !isConnected) {
       // Now connectAndStream assumes telloService is initialized
       dispatch(connectAndStream()).catch(err => { /* ... error handling ... */ });
     }
   };
   const handleDisconnect = () => {
     dispatch(disconnect()).catch(err => { /* ... error handling ... */ });
   };

   // --- NEW Handlers for Media Controls ---
  const handlePhotoCapture = useCallback(() => {
    if (!isConnected) return; // Should be disabled, but double check
    Alert.alert("Capture", "Photo capture button pressed!");
    // In a real app: telloService.sendCommand('takepicture'); // Or similar command
}, [isConnected]); // Dependency: isConnected (to potentially show different alerts?)

const handleRecordingToggle = useCallback(() => {
  if (!isConnected) return; // Should be disabled, but double check
  const nextRecordingState = !isRecording;
  setIsRecording(nextRecordingState); // Toggle the local state

  if (nextRecordingState) {
      Alert.alert("Recording", "Started recording!");
       // In a real app: telloService.sendCommand('startrecording'); // Or trigger FFmpeg record etc.
  } else {
      Alert.alert("Recording", "Stopped recording!");
       // In a real app: telloService.sendCommand('stoprecording'); // Or stop FFmpeg record etc.
  }
}, [isRecording, isConnected]); // Dependencies: isRecording (to toggle), isConnected

  // --- Helper for Battery Color ---
  const getBatteryColor = () => {
    if (battery === null || battery === undefined) return '#9ca3af'; // Gray-400 (disabled/unknown)
    if (battery > 60) return 'rgba(52, 211, 153, 0.9)';   // Emerald-400/90 (Green)
    if (battery > 25) return 'rgba(251, 191, 36, 0.9)';  // Amber-400/90 (Yellow)
    return 'rgba(248, 113, 113, 0.9)';     // Red-400/90 (Red)
  };

  // --- Render ---
  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />

      {/* Error display */}
      <ErrorMessageDisplay message={errorMessage} />

      {/* Video player */}
      <TelloVideoPlayer isStreaming={isConnected} videoUrl={videoUrl} />

      {/* Flight Controls (Top Left) */}
      <FlightControls
        isConnected={isConnected}
        onTakeoff={handleTakeoff}
        onLand={handleLand}
        onEmergency={handleEmergency}
      />

       {/* --- Status Displays --- */}

        {/* Battery Display (Top Left, next to flight controls) */}
        <View style={styles.batteryContainer}>
            <StatusBox
                icon={ // Battery Icon Path
                    <Path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7h14a2 2 0 012 2v6a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2zm14 1h2v6h-2V8z"
                    />
                }
                // Display battery % or '--' if null/undefined
                value={battery !== null && battery !== undefined ? `${battery}%` : '--'}
                color={getBatteryColor()} // Dynamic color based on value
                bgColor="rgba(0, 0, 0, 0.3)" // Standard background
            />
        </View>

        {/* Flight Time Display (Top Right) */}
        <View style={styles.flightTimeContainer}>
            <StatusBox
                icon={ // Clock Icon Path
                    <Path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                }
                // Display formatted time or '--'
                value={flightTime || '--'}
                color="rgba(168, 85, 247, 0.9)" // purple-400/90
                bgColor="rgba(168, 85, 247, 0.1)" // purple-500/10
            />
        </View>

        {/* Last Update Display (Top Right, below Flight Time) */}
        <View style={styles.lastUpdateContainer}>
            <StatusBox
                icon={ // Refresh Icon Path
                    <Path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" // Corrected refresh icon path
                    />
                }
                // Display locale time string or '--'
                value={lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '--'}
                color="rgba(251, 191, 36, 0.9)" // amber-400/90
                bgColor="rgba(251, 191, 36, 0.1)" // amber-500/10
            />
        </View>

      {/* NEW: Media Controls (Top Right Stacked) */}
      <MediaControls
          isEnabled={isConnected} // Enable buttons only when connected/streaming
          isRecording={isRecording} // Pass the recording state
          onCapturePress={handlePhotoCapture} // Pass the capture handler
          onRecordTogglePress={handleRecordingToggle} // Pass the toggle handler
      />


      {/* Connect/Disconnect Button (Top Center) */}
      <ControlButtons
        isConnected={isConnected}
        isConnecting={isConnecting}
        onConnectPress={handleConnect}
        onDisconnectPress={handleDisconnect}
      />
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  // --- Status Box Positioning ---
  batteryContainer: {
    position: 'absolute',
    top: 20, // Align with top of flight controls
    // Adjust left based on FlightControls width + gap
    // FlightControls width is roughly (10+20+10)*3 + 12*2 = 120 + 24 = 144
    // Left of FlightControls is 32. So start Battery at 32 + 144 + 12 = 188
    left: 188, // Adjust as needed based on actual rendering
    zIndex: 30,
  },
  flightTimeContainer: {
    position: 'absolute',
    top: 80, // Align top
    right: 32, // Consistent right margin
    zIndex: 30,
  },
  lastUpdateContainer: {
    position: 'absolute',
    top: 120, // Position below Flight Time (20 + box height ~30 + gap 8)
    right: 32, // Consistent right margin
    zIndex: 30,
  },
});

export default MainScreen;