// App.js
import React from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import MainScreen from './src/screens/MainScreen'; // Correct path

const App = () => {
  return (
    <Provider store={store}>
      <MainScreen />
    </Provider>
  );
};

export default App;