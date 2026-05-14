import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { getDb } from "@/db";
import { getAllMembers, MemberRow } from "@/db/dao/members";

function calcAge(dob: string) {
  const birth = new Date(dob);
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export default function MembersScreen() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const db = await getDb();
    setMembers(await getAllMembers(db));
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

  const scouts = members.filter((m) => m.role === "scout");
  const leaders = members.filter((m) => m.role === "leader");

  return (
    <FlatList
      data={[...leaders, ...scouts]}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={styles.empty}>
          No members yet. Sync to fetch from Scout Manager.
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <View
              style={[
                styles.badge,
                item.role === "leader" ? styles.badgeLeader : styles.badgeScout,
              ]}
            >
              <Text style={styles.badgeText}>
                {item.role === "leader" ? "Leader" : "Scout"}
              </Text>
            </View>
          </View>
          <Text style={styles.meta}>Age {calcAge(item.dob)}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10, backgroundColor: "#f5f5f5", flexGrow: 1 },
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
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: "600", color: "#222" },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeScout: { backgroundColor: "#e8f5e9" },
  badgeLeader: { backgroundColor: "#fff3e0" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#444" },
  meta: { fontSize: 13, color: "#888" },
  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 60,
    fontSize: 14,
    paddingHorizontal: 24,
  },
});
