import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { API_BASE_URL } from "@/api/client";

const ACCESS_KEY = "auth.accessToken";
const REFRESH_KEY = "auth.refreshToken";

let inFlightRefresh: Promise<string | null> | null = null;

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function saveTokens(accessToken: string, refreshToken: string) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
  ]);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}

/**
 * Refreshes the access token using the stored refresh token.
 * Uses a single in-flight promise to prevent race conditions
 * when multiple concurrent requests hit a 401.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    if (!refreshToken) return null;

    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
        refreshToken,
      });
      await saveTokens(data.accessToken, data.refreshToken);
      return data.accessToken as string;
    } catch {
      await clearTokens();
      return null;
    }
  })();

  try {
    return await inFlightRefresh;
  } finally {
    inFlightRefresh = null;
  }
}
