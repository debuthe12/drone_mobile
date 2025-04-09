// src/store/telloSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as telloService from '../services/telloService';
import * as ffmpegService from '../services/ffmpegService';
import * as orientationService from '../services/orientationService';

// --- Constants (can be moved to a config file later) ---
export const LOCAL_VIDEO_OUTPUT_HTTP_PORT = 11112;
export const VIDEO_URL = `http://127.0.0.1:${LOCAL_VIDEO_OUTPUT_HTTP_PORT}`;

// --- Async Thunks ---

// Thunk to handle connection, commands, and starting FFmpeg
export const connectAndStream = createAsyncThunk(
  'tello/connectAndStream',
  async (_, { dispatch, rejectWithValue }) => {
    dispatch(setError(null)); // Clear previous errors
    dispatch(setConnecting(true));

    try {
      await telloService.initialize();
      console.log('Socket Initialized');

      // Send initial commands
      await telloService.sendCommand('command');
      await new Promise(resolve => setTimeout(resolve, 300)); // Short delay
      await telloService.sendCommand('streamon');
      await new Promise(resolve => setTimeout(resolve, 300)); // Short delay

      console.log('Drone commands sent. Starting FFmpeg...');
      await ffmpegService.start(LOCAL_VIDEO_OUTPUT_HTTP_PORT); // Pass port if needed by service
      console.log('FFmpeg started command issued.');

      dispatch(setStreaming(true)); // Assume streaming starts if FFmpeg command executes
      return true; // Indicate success

    } catch (error) {
      console.error("Connection/Stream start failed:", error);
      // Attempt cleanup on failure
      await dispatch(disconnect()); // Use disconnect thunk for cleanup
      return rejectWithValue(error.message || 'Failed to connect and stream');

    } finally {
      dispatch(setConnecting(false));
    }
  }
);

// Thunk to handle disconnection and cleanup
export const disconnect = createAsyncThunk(
  'tello/disconnect',
  async (_, { dispatch }) => {
    console.log("Disconnecting and cleaning up...");
    dispatch(setStreaming(false)); // Immediately update UI state
    dispatch(setConnecting(false)); // Ensure connecting state is false

    try {
      // Best effort cleanup
      await ffmpegService.stop();
      console.log('FFmpeg stop command issued.');
    } catch (e) {
      console.error("Error stopping FFmpeg:", e);
    }

    try {
      // Send streamoff command *before* closing socket if possible
       await telloService.sendCommand('streamoff').catch(err => console.warn("Failed to send streamoff, might already be disconnected:", err));
       await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    } catch (e) {
        console.warn("Ignoring error sending streamoff during disconnect:", e);
    }


    try {
      await telloService.close();
      console.log('Tello service closed.');
    } catch (e) {
      console.error("Error closing Tello service:", e);
    }

    orientationService.unlock();
    console.log('Orientation unlocked.');

    dispatch(setError(null)); // Clear errors on disconnect
    return true; // Indicate cleanup attempt finished
  }
);

// --- Slice Definition ---
const initialState = {
  isConnecting: false, // Added state to track connection process
  isStreaming: false,
  errorMessage: null,
  videoUrl: VIDEO_URL, // Store the video URL here
};

const telloSlice = createSlice({
  name: 'tello',
  initialState,
  reducers: {
    setConnecting: (state, action) => {
      state.isConnecting = action.payload;
    },
    setStreaming: (state, action) => {
      state.isStreaming = action.payload;
    },
    setError: (state, action) => {
      state.errorMessage = action.payload;
    },
    // Can add more specific reducers if needed, e.g., for specific drone responses
  },
  extraReducers: (builder) => {
    builder
      // Connect and Stream
      .addCase(connectAndStream.pending, (state) => {
        state.isConnecting = true;
        state.errorMessage = null;
      })
      .addCase(connectAndStream.fulfilled, (state) => {
        // Streaming state is set within the thunk *before* it fulfills
        // if FFmpeg command is successful. Reducer doesn't need to set it here.
         state.isConnecting = false; // Ensure connecting is false on success
      })
      .addCase(connectAndStream.rejected, (state, action) => {
        state.isConnecting = false;
        state.isStreaming = false;
        state.errorMessage = `Connect Error: ${action.payload || 'Unknown error'}`;
      })
      // Disconnect
      .addCase(disconnect.fulfilled, (state) => {
        // State is reset within the thunk or by reducers called within it
        // Best practice might be reset state here for clarity
        state.isConnecting = false;
        state.isStreaming = false;
        state.errorMessage = null;
      })
       .addCase(disconnect.rejected, (state, action) => {
        // Log error but state should reflect disconnected status anyway
        console.error("Disconnect thunk failed:", action.error);
        state.isConnecting = false; // Ensure correct state even on failure
        state.isStreaming = false;
         state.errorMessage = "Cleanup might have failed. Check logs."; // Optional error
      });
  },
});

export const { setConnecting, setStreaming, setError } = telloSlice.actions;

export default telloSlice.reducer;