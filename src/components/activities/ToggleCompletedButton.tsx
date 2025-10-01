"use client";

import { toggleActivityCompleted } from "@/actions/activities";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ToggleCompletedButton({
  activityId,
  completed,
}: {
  activityId: string;
  completed: boolean;
}) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      await toggleActivityCompleted(activityId);
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
  );
}
