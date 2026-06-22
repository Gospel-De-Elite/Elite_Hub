import { useQuery } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import apiClient from "@/api/client";
import { setProfile } from "./userSlice";

// Login/register return the user object inline, but that's only ever in
// memory — on a page reload, Redux state resets while the token in
// localStorage survives. Without this, the profile would just be null
// after every reload despite the user still being authenticated.
export function useCurrentUserQuery() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const query = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await apiClient.get("/auth/me");
      return data.data;
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (query.data) {
      dispatch(setProfile(query.data));
    }
  }, [query.data, dispatch]);

  return query;
}
