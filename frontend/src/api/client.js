import axios from "axios";
import { store } from "@/app/store";
import { setTokens, clearAuth } from "@/features/auth/authSlice";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1",
});

apiClient.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight refresh: if several requests 401 at the same moment, only
// one actual /auth/refresh call goes out — the rest queue and replay once
// it resolves, instead of racing each other into a refresh-token rotation
// conflict (the backend revokes each refresh token on use).
let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(newAccessToken) {
  refreshSubscribers.forEach((callback) => callback(newAccessToken));
  refreshSubscribers = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    if (response?.status !== 401 || config._retry || config.url?.includes("/auth/")) {
      return Promise.reject(error);
    }

    const refreshToken = store.getState().auth.refreshToken;
    if (!refreshToken) {
      store.dispatch(clearAuth());
      return Promise.reject(error);
    }

    config._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshSubscribers.push((newAccessToken) => {
          config.headers.Authorization = `Bearer ${newAccessToken}`;
          resolve(apiClient(config));
        });
      });
    }

    isRefreshing = true;

    try {
      const { data } = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {
        refreshToken,
      });

      // The backend rotates refresh tokens on every use — the old one is
      // revoked the moment this call succeeds, so both tokens must be
      // updated together, not just the access token.
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data.data;
      store.dispatch(setTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken }));

      onRefreshed(newAccessToken);
      config.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(config);
    } catch (refreshError) {
      store.dispatch(clearAuth());
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
