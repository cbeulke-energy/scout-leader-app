import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { syncEngine } from "@/sync/engine";

const STATUS_CONFIG = {
  idle: { label: "Synced", color: "#2e7d32", textColor: "#fff" },
  syncing: { label: "Syncing…", color: "#1565c0", textColor: "#fff" },
  pending: { label: "Pending sync", color: "#e65100", textColor: "#fff" },
  error: { label: "Sync error", color: "#b71c1c", textColor: "#fff" },
} as const;

interface SyncStatusBarProps {
  /** Show even when idle (default: only shown when not idle) */
  alwaysVisible?: boolean;
}

export function SyncStatusBar({ alwaysVisible = false }: SyncStatusBarProps) {
  const { status, lastError } = useSyncStatus();

  if (status === "idle" && !alwaysVisible) return null;

  const cfg = STATUS_CONFIG[status];

  return (
    <TouchableOpacity
      onPress={() => syncEngine.syncNow()}
      disabled={status === "syncing"}
      accessibilityLabel={`Sync status: ${cfg.label}. Tap to sync now.`}
      activeOpacity={0.8}
    >
      <View style={[styles.bar, { backgroundColor: cfg.color }]}>
        {status === "syncing" && (
          <ActivityIndicator color="#fff" size="small" style={styles.spinner} />
        )}
        <Text style={[styles.label, { color: cfg.textColor }]}>{cfg.label}</Text>
        {status === "error" && lastError && (
          <Text style={[styles.detail, { color: cfg.textColor }]} numberOfLines={1}>
            {lastError}
          </Text>
        )}
        {status !== "syncing" && (
          <Text style={[styles.tapHint, { color: cfg.textColor }]}>Tap to retry</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  spinner: {
    marginRight: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  detail: {
    fontSize: 11,
    flex: 2,
    opacity: 0.85,
  },
  tapHint: {
    fontSize: 11,
    opacity: 0.7,
  },
});
