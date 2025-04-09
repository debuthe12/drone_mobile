// src/screens/MainScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import { View, StyleSheet, StatusBar, AppState, Alert, Platform } from 'react-native'; // Added Platform
import { useSelector, useDispatch } from 'react-redux';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // <-- Import the hook

// Components
import ErrorMessageDisplay from '../components/ErrorMessageDisplay';
import TelloVideoPlayer from '../components/TelloVideoPlayer';
import ControlButtons from '../components/ControlButtons';
import FlightControls from '../components/FlightControls';
import StatusBox from '../components/StatusBox';
import MediaControls from '../components/MediaControls';

// Redux and Services
import {
  connectAndStream,
  disconnect,
  setError,
  updateStatus,
} from '../store/telloSlice';
import * as telloService from '../services/telloService';
import * as orientationService from '../services/orientationService';
import * as ffmpegService from '../services/ffmpegService';

const MainScreen = () => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets(); // <--- Get safe area insets

  // --- Refs for dynamic layout calculations ---
  const flightControlsRef = useRef(null);
  const mediaControlsRef = useRef(null);
  const [flightControlsWidth, setFlightControlsWidth] = useState(150); // Initial estimate
  const [mediaControlsHeight, setMediaControlsHeight] = useState(50); // Initial estimate

  // --- Selectors ---
  const {
    isConnecting,
    isStreaming,
    errorMessage,
    videoUrl,
    battery,
    flightTime,
    lastUpdate,
  } = useSelector((state) => state.tello);

  const isConnected = isStreaming;
  const [isRecording, setIsRecording] = useState(false);

  // --- Callback for Status Updates ---
  const handleStatusUpdate = useCallback((statusData) => {
    if (statusData && !statusData.error) {
      dispatch(updateStatus(statusData));
    } else if (statusData?.error) {
        console.error("Status update callback received an error:", statusData.error);
        dispatch(setError(`Status Listener Error: ${statusData.error}`));
    }
  }, [dispatch]);

  // --- Effects ---

  // Tello Service Init/Cleanup
  useEffect(() => {
    console.log("MainScreen: Initializing Tello Service...");
    telloService.initialize(handleStatusUpdate)
        .then(() => console.log("MainScreen: Tello Service Initialized successfully."))
        .catch(err => {
            console.error("MainScreen: Failed to initialize Tello Service:", err);
            dispatch(setError(`Service Init Failed: ${err.message}`));
        });
    return () => {
      console.log("MainScreen: Closing Tello Service on unmount...");
      telloService.close();
    };
  }, [handleStatusUpdate, dispatch]);

  // Orientation, FFmpeg, App State
  useEffect(() => {
    orientationService.lockLandscape();
    ffmpegService.configure();
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState.match(/inactive|background/) && isStreaming) {
        dispatch(disconnect());
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      if (isStreaming) { // Check state from closure
           console.log("Stopping FFmpeg on unmount (from App State Effect)...");
           ffmpegService.stop().catch(e => console.error("Error stopping ffmpeg on unmount:", e));
       }
       orientationService.unlock();
    };
  }, [dispatch, isStreaming]); // isStreaming dependency is correct here

  // --- Layout Measurement ---
  // Measure components after they render to position dependents correctly
  const onFlightControlsLayout = (event) => {
      const { width } = event.nativeEvent.layout;
      if (width > 0 && width !== flightControlsWidth) {
          setFlightControlsWidth(width);
      }
  };

  const onMediaControlsLayout = (event) => {
      const { height } = event.nativeEvent.layout;
       if (height > 0 && height !== mediaControlsHeight) {
          setMediaControlsHeight(height);
      }
  };


  // --- Command Sending Handlers ---
  const sendFlightCommand = useCallback(async (command) => {
    if (!isConnected) {
      dispatch(setError('Cannot send command, drone not connected.'));
      return;
    }
    try {
      await telloService.sendCommand(command);
    } catch (error) {
      console.error(`Failed to send command "${command}":`, error);
      dispatch(setError(`Cmd Fail: ${command}: ${error.message}`));
    }
  }, [isConnected, dispatch]);

  const handleTakeoff = useCallback(() => sendFlightCommand('takeoff'), [sendFlightCommand]);
  const handleLand = useCallback(() => sendFlightCommand('land'), [sendFlightCommand]);
  const handleEmergency = useCallback(() => {
     Alert.alert(
        "Confirm Emergency Stop",
        "Are you sure you want to stop all motors immediately?",
        [ { text: "Cancel", style: "cancel" },
          { text: "Confirm Stop", onPress: () => sendFlightCommand('emergency'), style: "destructive" }
        ]);
  }, [sendFlightCommand]);

  // --- Connect/Disconnect Handlers ---
   const handleConnect = useCallback(() => {
     if (!isConnecting && !isConnected) {
       dispatch(connectAndStream()).catch(err => { console.error("Connect dispatch error", err)});
     }
   }, [dispatch, isConnecting, isConnected]); // Add dependencies

   const handleDisconnect = useCallback(() => {
     dispatch(disconnect()).catch(err => { console.error("Disconnect dispatch error", err)});
   }, [dispatch]); // Add dependency

   // --- Media Handlers ---
  const handlePhotoCapture = useCallback(() => {
    if (!isConnected) return;
    Alert.alert("Capture", "Photo capture simulated!"); // Placeholder
  }, [isConnected]);

  const handleRecordingToggle = useCallback(() => {
    if (!isConnected) return;
    const nextRecordingState = !isRecording;
    setIsRecording(nextRecordingState);
    Alert.alert("Recording", `${nextRecordingState ? 'Started' : 'Stopped'} recording (simulated)!`); // Placeholder
  }, [isRecording, isConnected]);

  // --- Helper for Battery Color ---
  const getBatteryColor = () => {
    if (battery === null || battery === undefined) return '#9ca3af';
    if (battery > 60) return 'rgba(52, 211, 153, 0.9)';
    if (battery > 25) return 'rgba(251, 191, 36, 0.9)';
    return 'rgba(248, 113, 113, 0.9)';
  };

   // --- Define margins/paddings relative to safe area ---
   const safeAreaPadding = {
       top: Platform.OS === 'android' ? 10 : 15, // Reduce top padding slightly
       side: 15,
       controlsTopMargin: 10,
       verticalGap: 8, // Consistent vertical gap
       horizontalGap: 12, // Consistent horizontal gap
       statusBoxHeightEstimate: 30, // Keep estimate for initial render
   };

  // --- Render ---
  return (
    <View style={styles.fullScreenContainer}>
      <StatusBar hidden={true} />

      {/* Video player fills the background */}
      <TelloVideoPlayer isStreaming={isConnected} videoUrl={videoUrl} />

       {/* Error display (absolute, respects top safe area, centered) */}
       {/* Position it slightly below the very top controls */}
      <View style={[styles.errorContainer, { top: insets.top + safeAreaPadding.controlsTopMargin + 50, left: insets.left + safeAreaPadding.side, right: insets.right + safeAreaPadding.side }]}>
          <ErrorMessageDisplay message={errorMessage} />
      </View>


      {/* --- Absolutely Positioned Controls Overlay --- */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

          {/* Connect/Disconnect Button (Top Center) */}
          <View style={[styles.controlButtonsContainer, { top: insets.top + safeAreaPadding.controlsTopMargin + 10 }]}>
            <ControlButtons
              isConnected={isConnected}
              isConnecting={isConnecting}
              onConnectPress={handleConnect}
              onDisconnectPress={handleDisconnect}
            />
          </View>

          {/* Flight Controls (Top Left) */}
          <View
             ref={flightControlsRef} // Add ref
             onLayout={onFlightControlsLayout} // Add layout handler
             style={[styles.flightControlsContainer, { top: insets.top + safeAreaPadding.controlsTopMargin, left: insets.left + safeAreaPadding.side }]}
             pointerEvents="box-none" // Allow touches on children
          >
             <FlightControls
                isConnected={isConnected}
                onTakeoff={handleTakeoff}
                onLand={handleLand}
                onEmergency={handleEmergency}
             />
          </View>

          {/* Battery Display (Top Left, next to flight controls) */}
          {/* Uses measured flightControlsWidth */}
          <View style={[styles.statusContainer, {
                top: insets.top + safeAreaPadding.controlsTopMargin + 25,
                left: insets.left + safeAreaPadding.side + flightControlsWidth + safeAreaPadding.horizontalGap
             }]}
             pointerEvents="box-none"
           >
              <StatusBox
                  icon={ <Path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h14a2 2 0 012 2v6a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2zm14 1h2v6h-2V8z"/> }
                  value={battery !== null && battery !== undefined ? `${battery}%` : '--'}
                  color={getBatteryColor()}
                  bgColor="rgba(0, 0, 0, 0.3)"
              />
          </View>

          {/* Media Controls (Top Right) */}
          <View
             ref={mediaControlsRef} // Add ref
             onLayout={onMediaControlsLayout} // Add layout handler
             style={[styles.mediaControlsContainer, { top: insets.top + safeAreaPadding.controlsTopMargin, right: insets.right + safeAreaPadding.side }]}
             pointerEvents="box-none" // Allow touches on children
           >
              <MediaControls
                  isEnabled={isConnected}
                  isRecording={isRecording}
                  onCapturePress={handlePhotoCapture}
                  onRecordTogglePress={handleRecordingToggle}
              />
          </View>

           {/* Flight Time Display (Top Right, below Media Controls) */}
           {/* Uses measured mediaControlsHeight */}
          <View style={[styles.statusContainer, {
                top: insets.top + safeAreaPadding.controlsTopMargin + mediaControlsHeight + safeAreaPadding.verticalGap,
                right: insets.right + safeAreaPadding.side
             }]}
             pointerEvents="box-none"
           >
              <StatusBox
                  icon={ <Path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/> }
                  value={flightTime || '--'}
                  color="rgba(168, 85, 247, 0.9)"
                  bgColor="rgba(168, 85, 247, 0.1)"
              />
          </View>

          {/* Last Update Display (Top Right, below Flight Time) */}
          <View style={[styles.statusContainer, {
                // Position below flight time: Top + MediaControls Height + Flight Time Box Height (estimate) + 2 gaps
                top: insets.top + safeAreaPadding.controlsTopMargin + mediaControlsHeight + safeAreaPadding.statusBoxHeightEstimate + (safeAreaPadding.verticalGap * 2),
                right: insets.right + safeAreaPadding.side
            }]}
            pointerEvents="box-none"
          >
              <StatusBox
                  icon={ <Path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/> }
                  value={lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '--'}
                  color="rgba(251, 191, 36, 0.9)"
                  bgColor="rgba(251, 191, 36, 0.1)"
              />
          </View>

      </View>{/* End Controls Overlay */}
    </View> // End fullScreenContainer
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorContainer: {
     position: 'absolute',
     alignItems: 'center', // Center the error message horizontally
     zIndex: 100,
     // top, left, right applied inline
  },
  // Containers for absolutely positioned controls
  controlButtonsContainer: {
      position: 'absolute',
      alignSelf: 'center', // Center horizontally
      zIndex: 50,
      // top applied inline
  },
  flightControlsContainer: {
      position: 'absolute',
      zIndex: 40,
      // top, left applied inline
  },
  mediaControlsContainer: {
      position: 'absolute',
      zIndex: 40,
      // top, right applied inline
   },
  // Generic container for status boxes to apply position/zIndex
  statusContainer: {
    position: 'absolute',
    zIndex: 30,
    // top, left/right applied inline
  },
});

export default MainScreen;