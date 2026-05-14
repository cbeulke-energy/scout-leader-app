import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { getDb } from "@/db";
import { getUpcomingActivities, ActivityRow } from "@/db/dao/activities";
import { SyncStatusBar } from "@/components/SyncStatusBar";
import { clearTokens } from "@/auth/tokens";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function DashboardScreen() {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<ActivityRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const db = await getDb();
    const rows = await getUpcomingActivities(db, 5);
    setUpcoming(rows);
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleLogout() {
    await clearTokens();
    router.replace("/login");
  }

  return (
    <View style={styles.container}>
      <SyncStatusBar />
      <FlatList
        data={upcoming}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>Upcoming Activities</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            No upcoming activities. Sync to fetch from Scout Manager.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>
              {formatDate(item.start_at)} · {item.location}
            </Text>
            <Text style={styles.cardType}>{item.type.toUpperCase()}</Text>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.attendanceShortcut}
              onPress={() => router.push("/(tabs)/attendance")}
            >
              <Text style={styles.attendanceShortcutText}>
                Mark Attendance →
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  list: { padding: 16, gap: 12 },
  header: { marginBottom: 4 },
  heading: { fontSize: 18, fontWeight: "700", color: "#222" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#222" },
  cardMeta: { fontSize: 13, color: "#666" },
  cardType: {
    fontSize: 11,
    color: "#1a5e20",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
    fontSize: 14,
    paddingHorizontal: 24,
  },
  footer: { marginTop: 24, gap: 12 },
  attendanceShortcut: {
    backgroundColor: "#1a5e20",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  attendanceShortcutText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  logoutBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  logoutText: { color: "#999", fontSize: 14 },
});
