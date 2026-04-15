"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  label?: string;
}

export function StarRatingInput({ value, onChange, label }: StarRatingInputProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const displayed = hovered ?? value ?? 0;

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      )}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange(value === star ? null : star)}
            className="p-0.5 transition-transform hover:scale-110"
            title={`${star} estrela${star > 1 ? "s" : ""}`}
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                star <= displayed
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-gray-600"
              }`}
            />
          </button>
        ))}
        {value != null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-2 text-xs text-gray-500 hover:text-gray-300"
          >
            Limpar
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-400">
        {value == null
          ? "Sem classificação"
          : `${value} estrela${value > 1 ? "s" : ""} — desempate em atividades do mesmo dia`}
      </p>
    </div>
  );
}
