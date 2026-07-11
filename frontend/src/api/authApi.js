import apiClient from "./client";

export const authApi = {
  register:            (payload)  => apiClient.post("/auth/register", payload),
  login:               (payload)  => apiClient.post("/auth/login", payload),
  logout:              (refreshToken) => apiClient.post("/auth/logout", { refreshToken }),
  logoutAll:           ()         => apiClient.post("/auth/logout-all"),
  forgotPassword:      (email)    => apiClient.post("/auth/forgot-password", { email }),
  resetPassword:       (payload)  => apiClient.post("/auth/reset-password", payload),
  verifyEmail:         (token)    => apiClient.get(`/auth/verify-email?token=${token}`),
  resendVerification:  ()         => apiClient.post("/auth/resend-verification"),
};
