// src/components/TelloVideoPlayer.js
import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Video from 'react-native-video';
import { useDispatch } from 'react-redux';
import { setError } from '../store/telloSlice'; // Import setError action

const TelloVideoPlayer = ({ isStreaming, videoUrl }) => {
  const videoPlayerRef = useRef(null);
  const dispatch = useDispatch();

  const onVideoLoad = useCallback(() => {
    console.log('Video player loaded stream successfully!');
    // Optionally clear specific video errors if needed
    // dispatch(setError(null)); // Maybe too broad, clears all errors
  }, [dispatch]);

  const onVideoError = useCallback((err) => {
    console.error('Video player error:', JSON.stringify(err, null, 2));
    const videoErrorMsg = err.error?.localizedDescription || err.error?.localizedFailureReason || err.error?.message || 'Unknown video player error';
    // Dispatch an action to set the error state in Redux
    dispatch(setError(`Video Player Error: ${videoErrorMsg}. Check console.`));
    // Consider automatically setting isStreaming to false here?
    // dispatch(setStreaming(false)); // Or trigger disconnect thunk? Depends on desired behavior.
  }, [dispatch]);

  return (
    <View style={styles.videoContainer}>
      {isStreaming ? (
        <Video
          ref={videoPlayerRef}
          source={{ uri: videoUrl }}
          style={styles.video}
          resizeMode="contain"
          onError={onVideoError}
          onLoad={onVideoLoad}
          repeat={false}
          muted={false} // Ensure audio is enabled if stream has it
          allowsExternalPlayback={false}
          paused={!isStreaming} // Explicitly pause if not streaming
          bufferConfig={{ // Optional: Fine-tune buffering
              minBufferMs: 15000,
              maxBufferMs: 50000,
              bufferForPlaybackMs: 2500,
              bufferForPlaybackAfterRebufferMs: 5000
          }}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch={"ignore"} // Try to play sound even if phone is silent
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Stream Paused / Disconnected</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  placeholderText: {
      color: '#ccc',
      fontSize: 16,
  }
});

export default TelloVideoPlayer;