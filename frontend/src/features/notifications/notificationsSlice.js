import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  unreadCount: 0,
  recent: [],
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setNotifications: (state, action) => {
      state.recent = action.payload.notifications;
      state.unreadCount = action.payload.unreadCount;
    },
    clearNotifications: () => initialState,
  },
});

export const { setNotifications, clearNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;
