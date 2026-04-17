import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Row {
  id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'on_time' | 'late' | 'absent' | 'manual';
}

const STATUS_LABEL: Record<Row['status'], string> = {
  on_time: 'Đúng giờ',
  late: 'Trễ',
  absent: 'Vắng',
  manual: 'Thủ công',
};

const STATUS_COLOR: Record<Row['status'], string> = {
  on_time: '#10b981',
  late: '#f59e0b',
  absent: '#ef4444',
  manual: '#6366f1',
};

export default function AttendanceHistoryScreen(): JSX.Element {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  async function load(): Promise<void> {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const { data } = await axios.get<{ data: { items: Row[] } }>(
        'http://10.0.2.2:3000/api/v1/attendance',
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setRows(data.data.items);
    } catch {
      // silent — display empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Lịch sử chấm công</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.empty}>Chưa có dữ liệu</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.date}>{item.work_date}</Text>
              <Text style={styles.times}>
                {item.check_in?.slice(11, 16) ?? '--:--'}  →  {item.check_out?.slice(11, 16) ?? '--:--'}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: STATUS_COLOR[item.status] + '20' },
              ]}
            >
              <Text
                style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}
              >
                {STATUS_LABEL[item.status]}
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f7f9' },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    padding: 20,
    paddingBottom: 12,
  },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  date: { fontSize: 14, fontWeight: '600', color: '#111' },
  times: { fontSize: 13, color: '#6b7280', marginTop: 4, fontFamily: 'Menlo' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
