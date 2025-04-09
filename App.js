// App.js
import React from 'react';
import { StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MainScreen from './src/screens/MainScreen'; // Correct path

const App = () => {
  return (
    <GestureHandlerRootView style={styles.flexOne}>
      <Provider store={store}>
        <SafeAreaProvider>
          <MainScreen />
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  flexOne: {
      flex: 1,
  },
});

export default App;