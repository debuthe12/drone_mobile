// src/services/orientationService.js
import Orientation from 'react-native-orientation-locker';

export const lockLandscape = () => {
  console.log("Orientation Service: Locking to Landscape");
  Orientation.lockToLandscape();
};

export const unlock = () => {
  console.log("Orientation Service: Unlocking Orientation");
  Orientation.unlockAllOrientations();
};