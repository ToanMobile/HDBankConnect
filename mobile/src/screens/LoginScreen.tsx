import React, { useState } from 'react';
import {
  Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, SafeAreaView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { login, fetchBranch, fetchMySchedule } from '../api/attendanceApi';
import { useAuthStore } from '../store/useAuthStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen(): JSX.Element {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onLogin(): Promise<void> {
    if (!email.trim() || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      const res = await login(email.trim().toLowerCase(), password);

      // Persist tokens
      await AsyncStorage.setItem('sa:access_token', res.accessToken);
      await AsyncStorage.setItem('sa:refresh_token', res.refreshToken);

      // Fetch branch config
      let branch = null;
      if (res.employee.branchId) {
        try {
          const b = await fetchBranch(res.employee.branchId);
          branch = {
            id: b.id,
            name: b.name,
            lat: b.latitude,
            lng: b.longitude,
            radius: b.radius_meters,
            wifi_bssids: b.wifi_bssids,
          };
        } catch { /* branch optional */ }
      }

      // Cache schedule for background task
      try {
        const sched = await fetchMySchedule();
        await AsyncStorage.setItem('sa:cached_schedule', JSON.stringify(sched));
      } catch { /* schedule optional */ }

      await setAuth(
        {
          id: res.employee.id,
          email: res.employee.email,
          fullName: res.employee.fullName,
          role: res.employee.role,
          branchId: res.employee.branchId,
        },
        res.accessToken,
        branch,
      );
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Không thể kết nối server';
      Alert.alert('Đăng nhập thất bại', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.kav}>
        <View style={s.header}>
          <View style={s.logoBox}>
            <Text style={s.logoEmoji}>📍</Text>
          </View>
          <Text style={s.appName}>Smart Attendance</Text>
          <Text style={s.tagline}>Zero-Touch Auto Check-In</Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            placeholder="employee@hdbank.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={[s.label, { marginTop: 16 }]}>Mật khẩu</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={onLogin}
          />

          <TouchableOpacity
            style={[s.btn, loading && s.btnOff]}
            onPress={onLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Đăng nhập</Text>}
          </TouchableOpacity>
        </View>

        <Text style={s.foot}>HDBank Smart Attendance System v2.0</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const TEAL = '#49B7C3';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f9fa' },
  kav: { flex: 1, justifyContent: 'center', padding: 28 },
  header: { alignItems: 'center', marginBottom: 36 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, elevation: 6,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8,
  },
  logoEmoji: { fontSize: 34 },
  appName: { fontSize: 26, fontWeight: '800', color: '#111', letterSpacing: -0.5 },
  tagline: { marginTop: 4, color: TEAL, fontWeight: '600', fontSize: 13 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111', backgroundColor: '#fafafa',
  },
  btn: {
    marginTop: 24, backgroundColor: TEAL,
    paddingVertical: 14, borderRadius: 10, alignItems: 'center',
    elevation: 4, shadowColor: TEAL,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  btnOff: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  foot: { marginTop: 28, textAlign: 'center', color: '#9ca3af', fontSize: 12 },
});
