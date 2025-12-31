"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  change?: number; // percentage change
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  change,
  className,
}: MetricCardProps) {
  const formattedValue = typeof value === "number"
    ? value.toLocaleString("pt-BR")
    : value;

  return (
    <div
      className={cn(
        "rounded-xl p-6 border",
        "bg-[#1a0022] border-[#792990]/30",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-white">{formattedValue}</p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className="rounded-lg bg-[#792990]/20 p-3">
          <Icon className="h-6 w-6 text-[#792990]" />
        </div>
      </div>

      {change !== undefined && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              change >= 0 ? "text-green-500" : "text-red-500"
            )}
          >
            {change >= 0 ? "+" : ""}{change}%
          </span>
          <span className="text-sm text-gray-500">vs período anterior</span>
        </div>
      )}
    </div>
  );
}
