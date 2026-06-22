import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import apiClient from "@/api/client";
import { setWallet } from "./walletSlice";

// Wallet lives in Redux per the UI/UX spec (always-visible header balance),
// but React Query still does the actual fetching/caching/refetching — this
// hook is the bridge between the two. Call invalidateQueries(["wallet"])
// after any funding/purchase action elsewhere to force a refresh.
export function useWalletQuery() {
  const dispatch = useDispatch();

  const query = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const { data } = await apiClient.get("/wallet");
      return data.data;
    },
  });

  useEffect(() => {
    if (query.data) {
      dispatch(setWallet(query.data));
    }
  }, [query.data, dispatch]);

  return query;
}
