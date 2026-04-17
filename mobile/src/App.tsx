import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import { registerBackgroundScheduler } from './services/BackgroundScheduler';

export default function App(): JSX.Element {
  useEffect(() => {
    void registerBackgroundScheduler();
  }, []);

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
