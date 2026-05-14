import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { getDb } from "@/db";
import { getAllActivities, ActivityRow } from "@/db/dao/activities";
import { getAllMembers, MemberRow } from "@/db/dao/members";
import {
  getAttendanceForActivity,
  upsertAttendance,
  AttendanceRow,
} from "@/db/dao/attendance";
import { enqueueMutation } from "@/db/dao/outbox";

type AttendanceStatus = "present" | "absent" | "excused";

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: "#2e7d32",
  absent: "#c62828",
  excused: "#ef6c00",
};

export default function AttendanceScreen() {
  const params = useLocalSearchParams<{ activityId?: string }>();
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    params.activityId ?? null
  );
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  async function loadActivities() {
    const db = await getDb();
    setActivities(await getAllActivities(db));
  }

  async function loadMembers(activityId: string) {
    const db = await getDb();
    const [allMembers, existingRows] = await Promise.all([
      getAllMembers(db),
      getAttendanceForActivity(db, activityId),
    ]);
    setMembers(allMembers);
    const map: Record<string, AttendanceStatus> = {};
    for (const row of existingRows) {
      map[row.member_id] = row.status;
    }
    setAttendance(map);
  }

  useFocusEffect(
    useCallback(() => {
      loadActivities().then(() => {
        if (selectedId) loadMembers(selectedId);
      });
    }, [])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadActivities();
    if (selectedId) await loadMembers(selectedId);
    setRefreshing(false);
  }

  async function handleSelectActivity(id: string) {
    setSelectedId(id);
    setAttendance({});
    await loadMembers(id);
  }

  async function handleMark(memberId: string, status: AttendanceStatus) {
    if (!selectedId) return;
    setSaving(memberId);
    try {
      const db = await getDb();
      const id = Crypto.randomUUID();
      const recordedAt = new Date().toISOString();
      await upsertAttendance(db, {
        id,
        activity_id: selectedId,
        member_id: memberId,
        status,
        recorded_at: recordedAt,
      });
      await enqueueMutation(db, {
        id: Crypto.randomUUID(),
        entityType: "attendance",
        idempotencyKey: `attendance:${selectedId}:${memberId}`,
        payload: { activityId: selectedId, memberId, status, id, recordedAt },
      });
      setAttendance((prev) => ({ ...prev, [memberId]: status }));
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setSaving(null);
    }
  }

  const selected = activities.find((a) => a.id === selectedId);

  if (!selectedId || !selected) {
    return (
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.pickLabel}>Select an activity to mark attendance</Text>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            No activities yet. Sync to fetch from Scout Manager.
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.activityCard}
            onPress={() => handleSelectActivity(item.id)}
          >
            <Text style={styles.activityTitle}>{item.title}</Text>
            <Text style={styles.activityDate}>
              {new Date(item.start_at).toLocaleDateString("sv-SE")}
            </Text>
          </TouchableOpacity>
        )}
      />
    );
  }

  const presentCount = Object.values(attendance).filter(
    (s) => s === "present"
  ).length;

  return (
    <FlatList
      data={members}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.activityHeader}>
          <TouchableOpacity onPress={() => setSelectedId(null)}>
            <Text style={styles.back}>← Change activity</Text>
          </TouchableOpacity>
          <Text style={styles.activityName}>{selected.title}</Text>
          <Text style={styles.attendanceSummary}>
            {presentCount} / {members.length} present
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          No members found. Sync to fetch from Scout Manager.
        </Text>
      }
      renderItem={({ item }) => {
        const current = attendance[item.id];
        const isSaving = saving === item.id;
        return (
          <View style={styles.memberCard}>
            <Text style={styles.memberName}>{item.name}</Text>
            <View style={styles.statusRow}>
              {(["present", "absent", "excused"] as AttendanceStatus[]).map(
                (s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusBtn,
                      current === s && {
                        backgroundColor: STATUS_COLORS[s],
                        borderColor: STATUS_COLORS[s],
                      },
                    ]}
                    onPress={() => !isSaving && handleMark(item.id, s)}
                    disabled={isSaving}
                  >
                    <Text
                      style={[
                        styles.statusBtnText,
                        current === s && styles.statusBtnTextActive,
                      ]}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10, backgroundColor: "#f5f5f5", flexGrow: 1 },
  pickLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
  },
  activityCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityTitle: { fontSize: 15, fontWeight: "600", color: "#222" },
  activityDate: { fontSize: 13, color: "#888" },
  activityHeader: { marginBottom: 8, gap: 4 },
  back: { color: "#1a5e20", fontSize: 14, fontWeight: "500", marginBottom: 4 },
  activityName: { fontSize: 17, fontWeight: "700", color: "#222" },
  attendanceSummary: { fontSize: 13, color: "#666" },
  memberCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  memberName: { fontSize: 15, fontWeight: "600", color: "#222" },
  statusRow: { flexDirection: "row", gap: 8 },
  statusBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  statusBtnText: { fontSize: 13, color: "#555", fontWeight: "500" },
  statusBtnTextActive: { color: "#fff" },
  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 60,
    fontSize: 14,
    paddingHorizontal: 24,
  },
});
