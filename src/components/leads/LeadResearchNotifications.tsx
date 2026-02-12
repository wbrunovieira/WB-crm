"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  const shownNotifications = useRef<Set<string>>(new Set());

  const checkNotifications = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/notifications?type=LEAD_RESEARCH_COMPLETE&read=false&limit=5"
      );

      if (!response.ok) return;

      const notifications: Notification[] = await response.json();

      // Also check for error notifications
      const errorResponse = await fetch(
        "/api/notifications?type=LEAD_RESEARCH_ERROR&read=false&limit=5"
      );

      if (errorResponse.ok) {
        const errorNotifications: Notification[] = await errorResponse.json();
        notifications.push(...errorNotifications);
      }

      // Filter out already shown notifications
      const newNotifications = notifications.filter(
        (n) => !shownNotifications.current.has(n.id)
      );

      for (const notification of newNotifications) {
        // Mark as shown
        shownNotifications.current.add(notification.id);

        // Show toast based on type
        if (notification.type === "LEAD_RESEARCH_COMPLETE") {
          toast.success(notification.summary, {
            description: "Clique para ver os novos leads",
            duration: 8000,
            action: {
              label: "Ver",
              onClick: () => {
                router.refresh();
              },
            },
          });
        } else if (notification.type === "LEAD_RESEARCH_ERROR") {
          toast.error(notification.summary, {
            duration: 10000,
          });
        }

        // Mark notification as read
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [notification.id] }),
        });

        // Refresh the page to show new leads
        if (notification.type === "LEAD_RESEARCH_COMPLETE") {
          router.refresh();
        }
      }
    } catch (error) {
      console.error("Error checking notifications:", error);
    }
  }, [router]);

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
