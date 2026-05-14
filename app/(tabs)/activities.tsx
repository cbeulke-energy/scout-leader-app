import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { getDb } from "@/db";
import { getAllActivities, ActivityRow } from "@/db/dao/activities";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivitiesScreen() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const db = await getDb();
    setActivities(await getAllActivities(db));
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

  return (
    <FlatList
      data={activities}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={styles.empty}>
          No activities yet. Sync to fetch from Scout Manager.
        </Text>
      }
      renderItem={({ item }) => {
        const isPast = new Date(item.start_at) < new Date();
        return (
          <TouchableOpacity
            style={[styles.card, isPast && styles.cardPast]}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/attendance",
                params: { activityId: item.id },
              })
            }
          >
            <View style={styles.row}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.type}>{item.type.toUpperCase()}</Text>
            </View>
            <Text style={styles.date}>{formatDate(item.start_at)}</Text>
            {item.location ? (
              <Text style={styles.location}>{item.location}</Text>
            ) : null}
            {isPast && (
              <Text style={styles.attendanceHint}>Tap to mark attendance</Text>
            )}
          </TouchableOpacity>
        );
      }}
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
  cardPast: { opacity: 0.8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: "600", color: "#222" },
  type: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1a5e20",
    letterSpacing: 0.5,
  },
  date: { fontSize: 13, color: "#666" },
  location: { fontSize: 13, color: "#888" },
  attendanceHint: { fontSize: 12, color: "#1a5e20", fontWeight: "500" },
  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 60,
    fontSize: 14,
    paddingHorizontal: 24,
  },
});
