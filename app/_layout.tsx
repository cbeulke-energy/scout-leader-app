import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getDb } from "@/db";
import { syncEngine } from "@/sync/engine";
import { startNetworkListener } from "@/sync/network-listener";

export default function RootLayout() {
  useEffect(() => {
    let stopNetworkListener: (() => void) | null = null;

    async function bootstrap() {
      const db = await getDb();
      syncEngine.init(db);
      stopNetworkListener = startNetworkListener();
      // Kick off an initial sync on app open if online
      syncEngine.syncNow().catch(() => {});
    }

    bootstrap();

    return () => {
      stopNetworkListener?.();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#1a5e20" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
