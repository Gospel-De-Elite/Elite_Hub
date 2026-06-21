import apiClient from "./client";

export const authApi = {
  register: (payload) => apiClient.post("/auth/register", payload),
  login: (payload) => apiClient.post("/auth/login", payload),
  logout: (refreshToken) => apiClient.post("/auth/logout", { refreshToken }),
  logoutAll: () => apiClient.post("/auth/logout-all"),
  forgotPassword: (email) => apiClient.post("/auth/forgot-password", { email }),
  resetPassword: (payload) => apiClient.post("/auth/reset-password", payload),
};
