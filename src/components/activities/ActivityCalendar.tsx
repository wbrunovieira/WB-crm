"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import ActivityTypeIcon from "./ActivityTypeIcon";

type Activity = {
  id: string;
  type: string;
  subject: string;
  dueDate: Date | null;
  completed: boolean;
};

type ActivityCalendarProps = {
  activities: Activity[];
  currentMonth: number;
  currentYear: number;
};

export default function ActivityCalendar({
  activities,
  currentMonth,
  currentYear,
}: ActivityCalendarProps) {
  const router = useRouter();

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getActivitiesForDay = (day: number) => {
    return activities.filter((activity) => {
      if (!activity.dueDate) return false;
      const activityDate = new Date(activity.dueDate);
      return (
        activityDate.getDate() === day &&
        activityDate.getMonth() === currentMonth &&
        activityDate.getFullYear() === currentYear
      );
    });
  };

  const handlePrevMonth = () => {
    const newMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const newYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    router.push(`/activities/calendar?month=${newMonth}&year=${newYear}`);
  };

  const handleNextMonth = () => {
    const newMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const newYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    router.push(`/activities/calendar?month=${newMonth}&year=${newYear}`);
  };

  const handleToday = () => {
    const now = new Date();
    router.push(`/activities/calendar?month=${now.getMonth()}&year=${now.getFullYear()}`);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {monthNames[currentMonth]} {currentYear}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleToday}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hoje
          </button>
          <button
            onClick={handlePrevMonth}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ←
          </button>
          <button
            onClick={handleNextMonth}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div
            key={day}
            className="bg-gray-50 p-2 text-center text-sm font-semibold text-gray-900"
          >
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          const dayActivities = day ? getActivitiesForDay(day) : [];
          const isToday =
            day === new Date().getDate() &&
            currentMonth === new Date().getMonth() &&
            currentYear === new Date().getFullYear();

          return (
            <div
              key={index}
              className={`min-h-[120px] bg-white p-2 ${
                !day ? "bg-gray-50" : ""
              } ${isToday ? "ring-2 ring-primary" : ""}`}
            >
              {day && (
                <>
                  <div
                    className={`mb-2 text-sm font-medium ${
                      isToday
                        ? "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white"
                        : "text-gray-900"
                    }`}
                  >
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayActivities.slice(0, 3).map((activity) => (
                      <Link
                        key={activity.id}
                        href={`/activities/${activity.id}`}
                        className={`flex items-center gap-1 rounded px-1 py-0.5 text-xs hover:bg-gray-100 ${
                          activity.completed
                            ? "text-gray-500 line-through"
                            : "text-gray-900"
                        }`}
                      >
                        <div className="flex-shrink-0">
                          <ActivityTypeIcon type={activity.type} />
                        </div>
                        <span className="truncate">{activity.subject}</span>
                      </Link>
                    ))}
                    {dayActivities.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{dayActivities.length - 3} mais
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
