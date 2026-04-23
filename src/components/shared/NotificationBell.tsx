"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, Mail, MessageCircle, CheckCheck } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  payload: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const token = session?.user?.accessToken ?? "";

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<{ notifications: NotificationItem[] }>("/notifications?limit=20", token);
      setNotifications(data.notifications);
    } catch {
      // silently ignore
    }
  }, [token]);

  // SSE connection with auto-reconnect
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (!token) return;
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3010";
      es = new EventSource(
        `${backendUrl}/notifications/stream?token=${encodeURIComponent(token)}`
      );

      es.onmessage = (event) => {
        try {
          const notification: NotificationItem = JSON.parse(event.data);
          setNotifications((prev) => {
            // avoid duplicates
            if (prev.some((n) => n.id === notification.id)) return prev;
            return [{ ...notification, read: false }, ...prev].slice(0, 20);
          });
        } catch {
          // malformed event
        }
      };

      es.onerror = () => {
        es?.close();
        // Force session refresh so jwt callback regenerates expired accessToken,
        // then reconnect with the fresh token after 5s.
        updateSession().finally(() => {
          retryTimeout = setTimeout(connect, 5_000);
        });
      };
    }

    fetchNotifications();
    if (token) connect();

    return () => {
      es?.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [fetchNotifications, token]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function markRead(ids: string[]) {
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
    );
    if (token) {
      await apiFetch("/notifications/read", token, {
        method: "PATCH",
        body: JSON.stringify({ ids }),
      }).catch(() => {});
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (token) {
      await apiFetch("/notifications/read", token, {
        method: "PATCH",
        body: JSON.stringify({ all: true }),
      }).catch(() => {});
    }
  }

  function handleNotificationClick(notification: NotificationItem) {
    if (!notification.read) markRead([notification.id]);
    const link = notification.payload
      ? (() => {
          try {
            return JSON.parse(notification.payload).link as string | undefined;
          } catch {
            return undefined;
          }
        })()
      : undefined;
    if (link) {
      setOpen(false);
      router.push(link);
    }
  }

  function getIcon(type: string) {
    if (type === "EMAIL_RECEIVED") return <Mail className="h-4 w-4 text-blue-400 flex-shrink-0" />;
    if (type === "WHATSAPP_RECEIVED") return <MessageCircle className="h-4 w-4 text-green-400 flex-shrink-0" />;
    return <Bell className="h-4 w-4 text-purple-400 flex-shrink-0" />;
  }

  function formatTime(iso: string) {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "agora";
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-xl shadow-2xl border z-50 overflow-hidden"
          style={{ backgroundColor: "#1a0022", borderColor: "#792990" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#792990" }}>
            <span className="text-sm font-semibold text-white">Notificações</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-purple-300 hover:text-white transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 border-b last:border-b-0"
                  style={{ borderColor: "#2a0033" }}
                >
                  <div className="mt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${n.read ? "text-gray-400" : "text-white font-medium"}`}>
                      {n.title}
                    </p>
                    {n.summary && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{n.summary}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] text-gray-600">{formatTime(n.createdAt)}</span>
                    {!n.read && (
                      <span className="block h-2 w-2 rounded-full bg-purple-500" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
