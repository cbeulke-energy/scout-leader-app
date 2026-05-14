import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { getAccessToken } from "@/auth/tokens";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    getAccessToken().then((token) => {
      if (token) {
        router.replace("/(tabs)");
      } else {
        router.replace("/login");
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#fff" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a5e20",
  },
});
