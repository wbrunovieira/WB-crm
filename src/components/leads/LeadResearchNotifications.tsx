"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

type Notification = {
  id: string;
  type: string;
  jobId: string | null;
  status: string;
  title: string;
  summary: string;
  read: boolean;
  createdAt: string;
};

/**
 * Component that polls for lead research notifications and shows toasts.
 * Should be included in the leads page layout.
 */
export function LeadResearchNotifications() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const shownNotifications = useRef<Set<string>>(new Set());

  const checkNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const [completeData, errorData] = await Promise.all([
        apiFetch<{ notifications: Notification[] }>(
          "/notifications?type=LEAD_RESEARCH_COMPLETE&unread=true&limit=5",
          token,
        ).catch(() => ({ notifications: [] as Notification[] })),
        apiFetch<{ notifications: Notification[] }>(
          "/notifications?type=LEAD_RESEARCH_ERROR&unread=true&limit=5",
          token,
        ).catch(() => ({ notifications: [] as Notification[] })),
      ]);

      const notifications = [...completeData.notifications, ...errorData.notifications];

      const newNotifications = notifications.filter(
        (n) => !shownNotifications.current.has(n.id)
      );

      for (const notification of newNotifications) {
        shownNotifications.current.add(notification.id);

        if (notification.type === "LEAD_RESEARCH_COMPLETE") {
          toast.success(notification.summary, {
            description: "Clique para ver os novos leads",
            duration: Infinity,
            dismissible: true,
            closeButton: true,
            action: {
              label: "Ver",
              onClick: () => {
                router.refresh();
              },
            },
          });
        } else if (notification.type === "LEAD_RESEARCH_ERROR") {
          toast.error(notification.summary, {
            duration: Infinity,
            dismissible: true,
            closeButton: true,
          });
        }

        await apiFetch("/notifications/read", token, {
          method: "PATCH",
          body: JSON.stringify({ ids: [notification.id] }),
        }).catch(() => {});

        if (notification.type === "LEAD_RESEARCH_COMPLETE") {
          router.refresh();
        }
      }
    } catch (error) {
      console.error("Error checking notifications:", error);
    }
  }, [router, token]);

  useEffect(() => {
    // Check immediately on mount
    checkNotifications();

    // Then poll every 10 seconds
    const interval = setInterval(checkNotifications, 10000);

    return () => clearInterval(interval);
  }, [checkNotifications]);

  // This component doesn't render anything visible
  return null;
}
