// src/screens/MainScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, StatusBar, AppState, Alert, Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Components
import ErrorMessageDisplay from '../components/ErrorMessageDisplay';
import TelloVideoPlayer from '../components/TelloVideoPlayer';
import ControlButtons from '../components/ControlButtons';
import FlightControls from '../components/FlightControls';
import StatusBox from '../components/StatusBox';
import MediaControls from '../components/MediaControls';
import VirtualJoystick from '../components/VirtualJoystick'; // <-- Import Joystick

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


const RC_MAX_VALUE = 100; // Tello expects values between -100 and 100

const MainScreen = () => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

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

  // isConnected is true only when streaming is active
  const isConnected = isStreaming;
  const [isRecording, setIsRecording] = useState(false);

  // --- Refs for RC Control ---
  const leftStick = useRef({ x: 0, y: 0 });
  const rightStick = useRef({ x: 0, y: 0 });
 

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
  }, [handleStatusUpdate, dispatch]); // Include dispatch

  // Orientation, FFmpeg, App State
  useEffect(() => {
    orientationService.lockLandscape();
    ffmpegService.configure();
    const handleAppStateChange = (nextAppState) => {
      // If app goes to background/inactive while connected, disconnect
      if (nextAppState.match(/inactive|background/) && isConnected) { // Check isConnected (which is isStreaming)
        console.log("App inactive, dispatching disconnect...");
        dispatch(disconnect());
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      // Cleanup orientation lock if needed (though locking on mount is more common)
      orientationService.unlock();
      // FFmpeg stop is handled by disconnect thunk or this effect's dependency change
    };
  }, [dispatch, isConnected]); // Depend on isConnected now

   

  // --- Layout Measurement ---
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
   }, [dispatch, isConnecting, isConnected]);

   const handleDisconnect = useCallback(() => {
     dispatch(disconnect()).catch(err => { console.error("Disconnect dispatch error", err)});
     // Reset joystick values immediately on disconnect request
     leftStick.current = { x: 0, y: 0 };
     rightStick.current = { x: 0, y: 0 };
   }, [dispatch]);

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

   // --- RC Command Handling Callbacks ---

  // Callback for Left Joystick movement
  const handleLeftJoystickMove = useCallback(({ x, y }) => {
    // Left Stick: X = Yaw, Y = Throttle
    // Invert Y axis: Up on stick = positive Y Tello value
    leftStick.current = { x: x, y: -y };
  }, []); // No dependencies needed

  // Callback for Right Joystick movement
  const handleRightJoystickMove = useCallback(({ x, y }) => {
    // Right Stick: X = Roll, Y = Pitch
    // Invert Y axis: Up on stick = positive Y Tello value (forward)
    rightStick.current = { x: x, y: -y };
  }, []); // No dependencies needed


  // --- Helper for Battery Color ---
  const getBatteryColor = () => {
    if (battery === null || battery === undefined) return '#9ca3af';
    if (battery > 60) return 'rgba(52, 211, 153, 0.9)';
    if (battery > 25) return 'rgba(251, 191, 36, 0.9)';
    return 'rgba(248, 113, 113, 0.9)';
  };

   // --- Define margins/paddings relative to safe area ---
   const safeAreaPadding = {
       top: Platform.OS === 'android' ? 5 : 10, // Adjusted top padding
       side: 15,
       controlsTopMargin: 10, // Base top margin for controls
       verticalGap: 8,
       horizontalGap: 12,
       statusBoxHeightEstimate: 30,
   };

  // --- Render ---
  return (
    <View style={styles.fullScreenContainer}>
      <StatusBar hidden={true} />

      {/* Video player fills the background */}
      <TelloVideoPlayer isStreaming={isConnected} videoUrl={videoUrl} />

       {/* Error display (absolute, respects top safe area, centered) */}
       {/* Position it below the Connect button */}
      <View style={[styles.errorContainer, { top: insets.top + safeAreaPadding.controlsTopMargin + 60, /* Adjust 60 based on button height */ left: insets.left + safeAreaPadding.side, right: insets.right + safeAreaPadding.side }]}>
          <ErrorMessageDisplay message={errorMessage} />
      </View>


      {/* --- Absolutely Positioned Controls Overlay --- */}
      {/* Use pointerEvents to allow joystick touches to pass through empty space */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

          {/* Connect/Disconnect Button (Top Center) */}
          <View style={[styles.controlButtonsContainer, { top: insets.top + safeAreaPadding.controlsTopMargin }]}>
            <ControlButtons
              isConnected={isConnected}
              isConnecting={isConnecting}
              onConnectPress={handleConnect}
              onDisconnectPress={handleDisconnect}
            />
          </View>

          {/* Flight Controls (Top Left) */}
          <View
             ref={flightControlsRef}
             onLayout={onFlightControlsLayout}
             style={[styles.flightControlsContainer, { top: insets.top + safeAreaPadding.controlsTopMargin, left: insets.left + safeAreaPadding.side }]}
             pointerEvents="box-none" // Container itself doesn't block touches
          >
             <FlightControls // FlightControls buttons ARE touchable
                isConnected={isConnected}
                onTakeoff={handleTakeoff}
                onLand={handleLand}
                onEmergency={handleEmergency}
             />
          </View>

          {/* Battery Display (Top Left, next to flight controls) */}
          <View style={[styles.statusContainer, {
                top: insets.top + safeAreaPadding.controlsTopMargin + 25, // Align top with flight controls
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
             ref={mediaControlsRef}
             onLayout={onMediaControlsLayout}
             style={[styles.mediaControlsContainer, { top: insets.top + safeAreaPadding.controlsTopMargin, right: insets.right + safeAreaPadding.side }]}
             pointerEvents="box-none"
           >
              <MediaControls // MediaControls buttons ARE touchable
                  isEnabled={isConnected}
                  isRecording={isRecording}
                  onCapturePress={handlePhotoCapture}
                  onRecordTogglePress={handleRecordingToggle}
              />
          </View>

           {/* Flight Time Display (Top Right, below Media Controls) */}
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

            {/* --- VIRTUAL JOYSTICK --- */}
            {/* Render conditionally */}
            {
                <VirtualJoystick
                    onLeftJoystickMove={handleLeftJoystickMove}
                    onRightJoystickMove={handleRightJoystickMove}
                />
            }


      </View>{/* End Controls Overlay */}
    </View> // End fullScreenContainer
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1, // Important for GestureHandlerRootView and general layout
    backgroundColor: '#000',
  },
  errorContainer: {
     position: 'absolute',
     alignItems: 'center', // Center the error message content
     zIndex: 100,
     // top, left, right applied inline
  },
  controlButtonsContainer: {
      position: 'absolute',
      alignSelf: 'center',
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
  statusContainer: {
    position: 'absolute',
    zIndex: 30,
    // top, left/right applied inline
  },
});

export default MainScreen;