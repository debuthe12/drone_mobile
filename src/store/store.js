// src/store/store.js
import { configureStore } from '@reduxjs/toolkit';
import telloReducer from './telloSlice';

export const store = configureStore({
  reducer: {
    tello: telloReducer,
    // Add other reducers here if your app grows
  },
  // Optional: Add middleware for logging, etc.
  // middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
});