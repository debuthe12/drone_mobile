// App.js
import React from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainScreen from './src/screens/MainScreen'; // Correct path

const App = () => {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
      <MainScreen />
      </SafeAreaProvider>
    </Provider>
  );
};

export default App;