import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Mail, MessageSquare, MessageCircle, CheckCheck } from "lucide-react";
import apiClient from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const CHANNEL_ICON = {
  IN_APP:    Bell,
  EMAIL:     Mail,
  SMS:       MessageSquare,
  WHATSAPP:  MessageCircle,
};

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1)  return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7)     return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage]         = useState(1);
  const [marking, setMarking]   = useState(null); // id of the item being marked

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", page],
    queryFn: async () => {
      const { data } = await apiClient.get("/notifications", { params: { page, limit: 20 } });
      return data.data;
    },
  });

  // Invalidate both the full list and the header bell summary so the
  // unread count badge updates immediately without waiting for its
  // 60-second polling interval.
  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-summary"] });
  }

  async function handleMarkAsRead(id) {
    if (marking) return;
    setMarking(id);
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      invalidate();
    } finally {
      setMarking(null);
    }
  }

  async function handleMarkAllAsRead() {
    setMarking("all");
    try {
      await apiClient.patch("/notifications/read-all");
      invalidate();
    } finally {
      setMarking(null);
    }
  }

  const notifications = data?.notifications || [];
  const unreadCount   = data?.unreadCount   ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "You're all caught up."}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={marking === "all"}
            onClick={handleMarkAllAsRead}
          >
            {marking === "all"
              ? <Spinner className="mr-2 h-4 w-4" />
              : <CheckCheck className="mr-2 h-4 w-4" />}
            Mark all as read
          </Button>
        )}
      </div>

      {/* ── Feed ─────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="h-8 w-8 text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                No notifications yet — wallet funding, orders, and referral rewards will show up here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const Icon    = CHANNEL_ICON[n.channel] || Bell;
                const isUnread = !n.readAt;

                return (
                  <li
                    key={n.id}
                    onClick={() => isUnread && handleMarkAsRead(n.id)}
                    className={`flex gap-4 px-5 py-4 transition-colors ${
                      isUnread
                        ? "cursor-pointer bg-primary/5 hover:bg-primary/10"
                        : "opacity-75"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isUnread
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {marking === n.id
                        ? <Spinner className="h-4 w-4" />
                        : <Icon className="h-4 w-4" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-medium ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </p>
                        {isUnread && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{n.body}</p>
                      <p className="text-xs text-muted-foreground/70">{timeAgo(n.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Pagination ───────────────────────────────────────────── */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
