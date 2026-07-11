"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

interface Props {
  partnerId: string;
  initialValue: number | null;
}

/** Inline 1–5 star rating for a partner. Mirrors LeadStarRatingInline but PATCHes /partners/:id. */
export function PartnerStarRatingInline({ partnerId, initialValue }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [value, setValue] = useState<number | null>(initialValue);
  const [hovered, setHovered] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const displayed = hovered ?? value ?? 0;

  async function handleClick(star: number) {
    const next = value === star ? null : star;
    const previous = value;
    setValue(next);
    setSaving(true);
    try {
      await apiFetch(`/partners/${partnerId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ starRating: next }),
      });
    } catch {
      toast.error("Erro ao salvar classificação.");
      setValue(previous);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-0.5" title={value ? `${value} estrela${value > 1 ? "s" : ""}` : "Sem classificação"}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={saving}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => handleClick(star)}
          className="p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
        >
          <Star
            className={`h-4 w-4 transition-colors ${
              star <= displayed
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-gray-300"
            }`}
          />
        </button>
      ))}
      {value != null && (
        <button
          type="button"
          disabled={saving}
          onClick={() => handleClick(value)}
          className="ml-1 text-[10px] text-gray-500 hover:text-gray-700 disabled:opacity-50"
          title="Limpar classificação"
        >
          ×
        </button>
      )}
    </div>
  );
}
