import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAccessToken, refreshAccessToken } from "@/auth/tokens";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});

client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-retry 401 handler: refresh token once, then replay the request
client.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retried?: boolean };
    if (err.response?.status === 401 && !original._retried) {
      original._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return client(original);
      }
    }
    return Promise.reject(err);
  }
);

export default client;
