import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  balance: "0",
  lockedBalance: "0",
  spendableBalance: "0",
};

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    setWallet: (state, action) => {
      const { balance, lockedBalance, spendableBalance } = action.payload;
      state.balance = balance;
      state.lockedBalance = lockedBalance;
      state.spendableBalance = spendableBalance;
    },
    clearWallet: () => initialState,
  },
});

export const { setWallet, clearWallet } = walletSlice.actions;
export default walletSlice.reducer;
