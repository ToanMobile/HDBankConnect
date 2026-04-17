import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { RouteProp } from '@react-navigation/native';
import { Text } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import AttendanceHistoryScreen from '../screens/AttendanceHistoryScreen';
import ReportScreen from '../screens/ReportScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useAuthStore } from '../store/useAuthStore';

// ─── Stack / Tab types ────────────────────────────────────────────────────────

type AuthStack = { Login: undefined };
type MainTabs = {
  HomeTab: undefined;
  HistoryTab: undefined;
  ReportTab: undefined;
  ProfileTab: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStack>();
const Tab = createBottomTabNavigator<MainTabs>();

const TEAL = '#49B7C3';

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  HomeTab:    { active: '🏠', inactive: '🏠' },
  HistoryTab: { active: '📋', inactive: '📋' },
  ReportTab:  { active: '📊', inactive: '📊' },
  ProfileTab: { active: '👤', inactive: '👤' },
};

function MainTabs(): JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: RouteProp<MainTabs>; navigation: unknown }): BottomTabNavigationOptions => ({
        headerStyle: { backgroundColor: TEAL },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' as const },
        tabBarActiveTintColor: TEAL,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#f3f4f6',
          height: 60,
          paddingBottom: 8,
        },
        tabBarIcon: ({ focused }: { focused: boolean; color: string; size: number }) => {
          const icon = TAB_ICONS[route.name];
          return (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
              {icon?.active ?? '●'}
            </Text>
          );
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: 'Chấm công', tabBarLabel: 'Trang chủ' }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={AttendanceHistoryScreen}
        options={{ title: 'Lịch sử', tabBarLabel: 'Lịch sử' }}
      />
      <Tab.Screen
        name="ReportTab"
        component={ReportScreen}
        options={{ title: 'Báo cáo', tabBarLabel: 'Báo cáo' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Hồ sơ', tabBarLabel: 'Hồ sơ' }}
      />
    </Tab.Navigator>
  );
}

// ─── Root navigator ───────────────────────────────────────────────────────────

export default function AppNavigator(): JSX.Element {
  const { user, hydrated, hydrate } = useAuthStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f9fa' }}>
        <ActivityIndicator color={TEAL} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user
        ? <MainTabs />
        : (
          <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Login" component={LoginScreen} />
          </AuthStack.Navigator>
        )}
    </NavigationContainer>
  );
}
