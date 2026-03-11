"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ActivitiesDateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";

  const today = new Date().toISOString().split("T")[0];
  const isToday = dateFrom === today && dateTo === today;

  const updateParams = (from: string, to: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (from) {
      params.set("dateFrom", from);
    } else {
      params.delete("dateFrom");
    }

    if (to) {
      params.set("dateTo", to);
    } else {
      params.delete("dateTo");
    }

    router.push(`/activities?${params.toString()}`);
  };

  const handleToday = () => {
    if (isToday) {
      updateParams("", "");
    } else {
      updateParams(today, today);
    }
  };

  const handleClear = () => {
    updateParams("", "");
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToday}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          isToday
            ? "bg-primary text-white"
            : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        Hoje
      </button>
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => updateParams(e.target.value, dateTo || e.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        title="Data inicial"
      />
      <span className="text-sm text-gray-400">a</span>
      <input
        type="date"
        value={dateTo}
        onChange={(e) => updateParams(dateFrom || e.target.value, e.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        title="Data final"
      />
      {(dateFrom || dateTo) && !isToday && (
        <button
          onClick={handleClear}
          className="rounded-md px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
          title="Limpar datas"
        >
          Limpar
        </button>
      )}
    </div>
  );
}
