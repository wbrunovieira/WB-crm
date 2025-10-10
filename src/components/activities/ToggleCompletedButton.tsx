"use client";

import { toggleActivityCompleted } from "@/actions/activities";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ScheduleNextActivityModal } from "./ScheduleNextActivityModal";

interface ToggleCompletedButtonProps {
  activityId: string;
  completed: boolean;
  dealId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  partnerId?: string | null;
  previousActivity?: {
    type?: string;
    subject?: string;
    description?: string | null;
    dealId?: string | null;
    dealTitle?: string;
    contactId?: string | null;
    contactName?: string;
    contactIds?: string | null;
    leadId?: string | null;
    leadName?: string;
    partnerId?: string | null;
    partnerName?: string;
  };
  availableData?: {
    deals: Array<{ id: string; title: string }>;
    contacts: Array<{ id: string; name: string }>;
    leads: Array<{ id: string; businessName: string }>;
    partners: Array<{ id: string; name: string }>;
  };
}

export default function ToggleCompletedButton({
  activityId,
  completed,
  previousActivity,
  availableData,
}: ToggleCompletedButtonProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      await toggleActivityCompleted(activityId);

      // Se estava incompleto e agora foi marcado como completo, abre o modal
      if (!completed && availableData && previousActivity) {
        setShowScheduleModal(true);
      }

      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar atividade"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={isUpdating}
        className={`h-6 w-6 flex-shrink-0 rounded-full border-2 transition-all disabled:opacity-50 ${
          completed
            ? "border-green-600 bg-green-600 hover:bg-green-700"
            : "border-gray-300 hover:border-primary"
        }`}
      >
        {completed && (
          <svg
            className="h-full w-full text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      {showScheduleModal && previousActivity && availableData && (
        <ScheduleNextActivityModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          previousActivity={previousActivity}
          availableData={availableData}
        />
      )}
    </>
  );
}
