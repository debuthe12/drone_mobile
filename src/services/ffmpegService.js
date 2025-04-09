// src/services/ffmpegService.js
import { FFmpegKit, ReturnCode, FFmpegKitConfig } from 'ffmpeg-kit-react-native';

const TELLO_VIDEO_PORT = 11111; // Tello sends video stream here
const LOCAL_VIDEO_INPUT_PORT = TELLO_VIDEO_PORT; // Port FFmpeg listens on

let currentSessionId = null; // Module-level variable

// Configure FFmpegKit logging (call this once, maybe in App.js or MainScreen useEffect)
export const configure = () => {
    console.log("FFmpeg Service: Configuring FFmpegKit logging.");
    FFmpegKitConfig.enableLogCallback(log => console.log(`FFmpegKit Log: ${log.getMessage()}`));
    FFmpegKitConfig.enableStatisticsCallback(stats => console.log(`FFmpegKit Stats: ${JSON.stringify(stats)}`));
    // Disable session history to prevent potential memory leaks if many sessions are created over time

};


export const start = (outputHttpPort) => {
  return new Promise(async (resolve, reject) => {
    if (currentSessionId) {
      console.warn("FFmpeg Service: Session already exists. Cancelling previous.");
      await stop().catch(e => console.error("FFmpeg Service: Error stopping previous session:", e)); // Attempt to stop previous
    }

    // Hardcoded command - consider making parts configurable
    const ffmpegCommand = `-f h264 -analyzeduration 1000000 -probesize 1000000 -fflags discardcorrupt -fflags nobuffer -flags low_delay -avioflags direct -i udp://0.0.0.0:${LOCAL_VIDEO_INPUT_PORT}?timeout=5000000 -c:v copy -f mpegts -listen 1 http://127.0.0.1:${outputHttpPort}`;

    console.log("FFmpeg Service: Starting FFmpeg with command:", ffmpegCommand);

    try {
      // Using executeAsync for non-blocking execution
      const session = await FFmpegKit.executeAsync(ffmpegCommand,
        async (completedSession) => {
          const sessionId = await completedSession.getSessionId();
          const returnCode = await completedSession.getReturnCode();
          console.log(`FFmpeg Service: Session ${sessionId} completed with code ${returnCode}.`);

          // Important: Clear the stored session ID *only if* it matches the completed one
          if (currentSessionId === sessionId) {
            currentSessionId = null;
          }

          if (ReturnCode.isSuccess(returnCode)) {
            console.log('FFmpeg Service: Process finished successfully.');
            // Maybe dispatch an action if needed, e.g., if stream stops unexpectedly
          } else if (ReturnCode.isCancel(returnCode)) {
            console.log('FFmpeg Service: Process cancelled.');
          } else {
            console.error('FFmpeg Service: Process failed!');
            const logs = await completedSession.getAllLogsAsString();
            console.error('------ FFmpeg Logs Start ------');
            console.error(logs || 'No logs captured.');
            console.error('------ FFmpeg Logs End --------');
            // Don't reject the start promise here, as it already resolved earlier.
            // Handle this failure via Redux state (e.g., set an error message)
             // Example: store.dispatch(setError('FFmpeg process exited unexpectedly.')); store.dispatch(setStreaming(false));
             // This needs access to the store, which services typically don't have directly.
             // The thunk (`connectAndStream`) should handle errors from the initial execution.
             // Errors *after* startup need a different mechanism (e.g., listener in MainScreen or another thunk).
          }
        }
        // Optional: logCallback and statisticsCallback can be added per-session too
      );

      currentSessionId = await session.getSessionId();
      console.log('FFmpeg Service: Session starting with ID:', currentSessionId);
      resolve(currentSessionId); // Resolve the promise once the execution *starts*

    } catch (error) {
      console.error('FFmpeg Service: Failed to execute command:', error);
      currentSessionId = null; // Clear ID on execution failure
      reject(new Error(`Failed to start FFmpeg: ${error.message}`));
    }
  });
};

export const stop = () => {
    return new Promise(async (resolve, reject) => {
        const sessionIdToCancel = currentSessionId;
        if (sessionIdToCancel) {
            console.log('FFmpeg Service: Cancelling session:', sessionIdToCancel);
            currentSessionId = null; // Clear immediately to prevent race conditions
            try {
                await FFmpegKit.cancel(sessionIdToCancel);
                console.log('FFmpeg Service: Cancel command sent for session:', sessionIdToCancel);
                resolve();
            } catch (e) {
                console.error("FFmpeg Service: Error cancelling FFmpeg session:", e);
                // Don't reject necessarily, maybe the session was already gone
                resolve(); // Resolve anyway as the goal is to stop
            }
        } else {
            console.log("FFmpeg Service: Stop called but no active session ID.");
            resolve(); // Nothing to stop
        }
    });
};