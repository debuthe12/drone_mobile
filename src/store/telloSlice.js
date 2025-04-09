// src/store/telloSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as telloService from '../services/telloService';
import * as ffmpegService from '../services/ffmpegService';
import * as orientationService from '../services/orientationService';

// --- Constants ---
export const LOCAL_VIDEO_OUTPUT_HTTP_PORT = 11112;
export const VIDEO_URL = `http://127.0.0.1:${LOCAL_VIDEO_OUTPUT_HTTP_PORT}`;

// --- Async Thunks ---

// Thunk to handle connection commands and starting FFmpeg
// Assumes telloService.initialize() has been called elsewhere (e.g., useEffect in MainScreen)
// to set up the socket and listener.
export const connectAndStream = createAsyncThunk(
  'tello/connectAndStream',
  async (_, { dispatch, rejectWithValue, getState }) => {
    dispatch(setError(null)); // Clear previous errors
    dispatch(setConnecting(true));

    try {
      

      // Send initial commands (ensure socket is ready via telloService state if possible,
      // but rely on prior initialization for now)
      console.log('Connect Thunk: Sending commands...');
      await telloService.sendCommand('command');
      await new Promise(resolve => setTimeout(resolve, 300)); // Short delay
      await telloService.sendCommand('streamon');
      await new Promise(resolve => setTimeout(resolve, 300)); // Short delay

      console.log('Connect Thunk: Drone commands sent. Starting FFmpeg...');
      await ffmpegService.start(LOCAL_VIDEO_OUTPUT_HTTP_PORT);
      console.log('Connect Thunk: FFmpeg start command issued.');

      // Crucially, set streaming state *after* FFmpeg command is issued successfully
      dispatch(setStreaming(true));
      return true; // Indicate success

    } catch (error) {
      console.error("Connect Thunk: Failed:", error);
      // Attempt cleanup on failure by dispatching disconnect thunk
      await dispatch(disconnect()); // Use disconnect thunk for cleanup
      return rejectWithValue(error.message || 'Failed to connect and stream');

    } finally {
      // Ensure connecting is false regardless of outcome after processing
       dispatch(setConnecting(false));
    }
  }
);

// Thunk to handle disconnection and cleanup
export const disconnect = createAsyncThunk(
  'tello/disconnect',
  async (_, { dispatch, getState }) => {
    console.log("Disconnect Thunk: Cleaning up...");

    // Get current state to prevent unnecessary actions
    const { isStreaming } = getState().tello;

    // Set state immediately for UI responsiveness
    dispatch(setStreaming(false));
    dispatch(setConnecting(false));
    dispatch(setError(null)); // Clear errors on disconnect

    let ffmpegStopped = false;
    let telloStreamOffSent = false;

    try {
        // Stop FFmpeg first
        console.log("Disconnect Thunk: Stopping FFmpeg...");
        await ffmpegService.stop();
        console.log('Disconnect Thunk: FFmpeg stop command issued.');
        ffmpegStopped = true;
    } catch (e) {
        console.error("Disconnect Thunk: Error stopping FFmpeg:", e);
    }

    // Only send streamoff if we were previously streaming (Tello might error otherwise)
    // It's possible telloService.close() might happen before this in some scenarios,
    // so wrap in try/catch.
    if (isStreaming) {
        try {
            console.log("Disconnect Thunk: Sending streamoff...");
            await telloService.sendCommand('streamoff');
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
            console.log("Disconnect Thunk: streamoff command sent.");
            telloStreamOffSent = true;
        } catch (e) {
            console.warn("Disconnect Thunk: Error sending streamoff (maybe already closed/disconnected?):", e);
        }
    }

    // Note: telloService.close() is handled by the useEffect cleanup in MainScreen
    // when the component unmounts or when the service needs re-initialization.
    // Avoid closing it here directly as it might interfere with the listener setup.

    try {
        // Unlock orientation
        orientationService.unlock();
        console.log('Disconnect Thunk: Orientation unlocked.');
    } catch(e) {
        console.error("Disconnect Thunk: Error unlocking orientation:", e);
    }


    // Return status object?
    return { ffmpegStopped, telloStreamOffSent };
  }
);


// --- Slice Definition ---
const initialState = {
  isConnecting: false,
  isStreaming: false,
  errorMessage: null,
  videoUrl: VIDEO_URL,
  battery: null,
  flightTime: null,
  lastUpdate: null,
};

const telloSlice = createSlice({
  name: 'tello',
  initialState,
  reducers: {
    setConnecting: (state, action) => {
      state.isConnecting = action.payload;
    },
    // setStreaming reducer now primarily controls the flag,
    // associated resets happen here or in extraReducers
    setStreaming: (state, action) => {
      const wasStreaming = state.isStreaming;
      state.isStreaming = action.payload;
      // Reset status only when changing from streaming (true) to not streaming (false)
      if (wasStreaming && !action.payload) {
         state.battery = null;
         state.flightTime = null;
         // Don't reset lastUpdate here, let extraReducers handle it on connect/disconnect actions
      }
       // Ensure connecting is false if we are setting streaming to true
      if(action.payload) {
          state.isConnecting = false;
      }
    },
    setError: (state, action) => {
      state.errorMessage = action.payload;
    },
    updateStatus: (state, action) => {
      const { bat, time, ...otherStatus } = action.payload;

      if (bat !== undefined) {
        state.battery = parseInt(bat, 10);
      }
      if (time !== undefined) {
          const totalSeconds = parseInt(time, 10);
          if (!isNaN(totalSeconds)) {
              const minutes = Math.floor(totalSeconds / 60);
              const seconds = totalSeconds % 60;
              state.flightTime = `${minutes}m ${seconds}s`;
          } else {
              state.flightTime = 'N/A';
          }
      }
      state.lastUpdate = Date.now();
    },
  },
  extraReducers: (builder) => {
    builder
      // Connect and Stream
      .addCase(connectAndStream.pending, (state) => {
        state.isConnecting = true;
        state.errorMessage = null;
        // Reset status on new connection attempt only if not already streaming
        // (though the thunk logic should prevent starting if already streaming)
        if (!state.isStreaming) {
            state.battery = null;
            state.flightTime = null;
            state.lastUpdate = null;
        }
      })
      .addCase(connectAndStream.fulfilled, (state, action) => {
          // State (isConnecting=false, isStreaming=true) is set by reducers/thunk logic now
          // This case might just log success if needed, or do nothing if handled already.
          if (action.payload === true) { // Ensure it actually succeeded
             console.log("connectAndStream fulfilled successfully.");
          } else if (action.payload === null) {
              console.log("connectAndStream fulfilled: No action taken (already streaming/connecting).");
              // Ensure state reflects reality if the thunk bailed early
              state.isConnecting = false; // Should be handled by finally block in thunk too
          }
      })
      .addCase(connectAndStream.rejected, (state, action) => {
        // State (isConnecting=false, isStreaming=false) should be handled by thunk/reducers
        // Just set the error message here.
        state.errorMessage = `Connect Error: ${action.payload || 'Unknown error'}`;
        // Ensure status is reset fully on rejection
        state.battery = null;
        state.flightTime = null;
        state.lastUpdate = null;
      })
      // Disconnect
       .addCase(disconnect.pending, (state) => {
         // Optional: Could indicate a "disconnecting" state if needed
         // state.isDisconnecting = true;
         console.log("Disconnect pending...");
       })
      .addCase(disconnect.fulfilled, (state, action) => {
        // State (isConnecting=false, isStreaming=false, error=null) is set by thunk/reducers
        console.log("Disconnect fulfilled:", action.payload);
         // Reset status fully on disconnect completion
        state.battery = null;
        state.flightTime = null;
        state.lastUpdate = null; // Reset last update time on clean disconnect
        // state.isDisconnecting = false;
      })
      .addCase(disconnect.rejected, (state, action) => {
        console.error("Disconnect thunk failed:", action.error);
        // Ensure state reflects disconnected status even on failure
        state.isConnecting = false; // Should already be false
        state.isStreaming = false; // Should already be false
        state.errorMessage = "Disconnect cleanup failed. Check logs.";
        // Reset status anyway
        state.battery = null;
        state.flightTime = null;
        state.lastUpdate = null;
         // state.isDisconnecting = false;
      });
  },
});

// Export actions and reducer
export const { setConnecting, setStreaming, setError, updateStatus } = telloSlice.actions;
export default telloSlice.reducer;