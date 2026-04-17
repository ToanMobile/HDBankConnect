import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import AttendanceHistoryScreen from '../screens/AttendanceHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

type RootStackParamList = {
  Home: undefined;
  History: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator(): JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#49B7C3' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Chấm công' }}
        />
        <Stack.Screen
          name="History"
          component={AttendanceHistoryScreen}
          options={{ title: 'Lịch sử' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Cài đặt' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
