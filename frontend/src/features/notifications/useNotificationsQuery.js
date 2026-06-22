import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import apiClient from "@/api/client";
import { setNotifications } from "./notificationsSlice";

export function useNotificationsQuery() {
  const dispatch = useDispatch();

  const query = useQuery({
    queryKey: ["notifications-summary"],
    queryFn: async () => {
      const { data } = await apiClient.get("/notifications?limit=5");
      return data.data;
    },
    refetchInterval: 60 * 1000,
  });

  useEffect(() => {
    if (query.data) {
      dispatch(setNotifications(query.data));
    }
  }, [query.data, dispatch]);

  return query;
}
