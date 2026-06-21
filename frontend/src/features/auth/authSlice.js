import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  accessToken: localStorage.getItem("eh_access_token") || null,
  refreshToken: localStorage.getItem("eh_refresh_token") || null,
  isAuthenticated: Boolean(localStorage.getItem("eh_refresh_token")),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setTokens: (state, action) => {
      const { accessToken, refreshToken } = action.payload;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      localStorage.setItem("eh_access_token", accessToken);
      localStorage.setItem("eh_refresh_token", refreshToken);
    },
    clearAuth: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem("eh_access_token");
      localStorage.removeItem("eh_refresh_token");
    },
  },
});

export const { setTokens, clearAuth } = authSlice.actions;
export default authSlice.reducer;
