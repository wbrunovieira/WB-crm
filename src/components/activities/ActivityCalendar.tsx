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
  deal?: {
    id: string;
    title: string;
    organization: {
      id: string;
      name: string;
    } | null;
  } | null;
  contact?: {
    id: string;
    name: string;
    organization: {
      id: string;
      name: string;
    } | null;
    partner: {
      id: string;
      name: string;
    } | null;
  } | null;
  lead?: {
    id: string;
    businessName: string;
  } | null;
};

type ActivityCalendarProps = {
  activities: Activity[];
  currentMonth: number;
  currentYear: number;
  view: "month" | "week" | "3day" | "day";
  selectedDate: Date;
};

export default function ActivityCalendar({
  activities,
  currentMonth,
  currentYear,
  view,
  selectedDate,
}: ActivityCalendarProps) {
  const router = useRouter();

  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const handleViewChange = (newView: string) => {
    const params = new URLSearchParams();
    params.set("view", newView);
    params.set("month", currentMonth.toString());
    params.set("year", currentYear.toString());
    params.set("date", selectedDate.toISOString());
    router.push(`/activities/calendar?${params.toString()}`);
  };

  const handlePrevPeriod = () => {
    const params = new URLSearchParams();
    params.set("view", view);

    if (view === "month") {
      const newMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const newYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      params.set("month", newMonth.toString());
      params.set("year", newYear.toString());
    } else {
      const date = new Date(selectedDate);
      if (view === "week") date.setDate(date.getDate() - 7);
      else if (view === "3day") date.setDate(date.getDate() - 3);
      else date.setDate(date.getDate() - 1);
      params.set("date", date.toISOString());
      params.set("month", date.getMonth().toString());
      params.set("year", date.getFullYear().toString());
    }

    router.push(`/activities/calendar?${params.toString()}`);
  };

  const handleNextPeriod = () => {
    const params = new URLSearchParams();
    params.set("view", view);

    if (view === "month") {
      const newMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const newYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      params.set("month", newMonth.toString());
      params.set("year", newYear.toString());
    } else {
      const date = new Date(selectedDate);
      if (view === "week") date.setDate(date.getDate() + 7);
      else if (view === "3day") date.setDate(date.getDate() + 3);
      else date.setDate(date.getDate() + 1);
      params.set("date", date.toISOString());
      params.set("month", date.getMonth().toString());
      params.set("year", date.getFullYear().toString());
    }

    router.push(`/activities/calendar?${params.toString()}`);
  };

  const handleToday = () => {
    const now = new Date();
    const params = new URLSearchParams();
    params.set("view", view);
    params.set("month", now.getMonth().toString());
    params.set("year", now.getFullYear().toString());
    params.set("date", now.toISOString());
    router.push(`/activities/calendar?${params.toString()}`);
  };

  const getActivityContext = (activity: Activity): { company: string | null; contact: string | null } => {
    let company = null;
    let contact = null;

    // Get company name
    if (activity.deal?.organization) {
      company = activity.deal.organization.name;
    } else if (activity.contact?.organization) {
      company = activity.contact.organization.name;
    } else if (activity.contact?.partner) {
      company = activity.contact.partner.name;
    } else if (activity.lead) {
      company = activity.lead.businessName;
    }

    // Get contact name
    if (activity.contact) {
      contact = activity.contact.name;
    }

    return { company, contact };
  };

  const getActivitiesForDate = (date: Date) => {
    return activities.filter((activity) => {
      if (!activity.dueDate) return false;
      const activityDate = new Date(activity.dueDate);
      // Use UTC methods to avoid timezone issues
      return (
        activityDate.getUTCDate() === date.getDate() &&
        activityDate.getUTCMonth() === date.getMonth() &&
        activityDate.getUTCFullYear() === date.getFullYear()
      );
    });
  };

  const renderMonthView = () => {
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

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {dayNames.map((day) => (
          <div
            key={day}
            className="bg-gray-50 p-2 text-center text-sm font-semibold text-gray-900"
          >
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          const date = day ? new Date(currentYear, currentMonth, day) : null;
          const dayActivities = date ? getActivitiesForDate(date) : [];
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
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((date, index) => {
          const dayActivities = getActivitiesForDate(date);
          const isToday =
            date.getDate() === new Date().getDate() &&
            date.getMonth() === new Date().getMonth() &&
            date.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={index}
              className={`rounded-lg border bg-white p-4 ${
                isToday ? "ring-2 ring-primary" : "border-gray-200"
              }`}
            >
              <div className="mb-3 text-center">
                <div className="text-xs font-medium text-gray-500">
                  {dayNames[date.getDay()]}
                </div>
                <div
                  className={`text-2xl font-bold ${
                    isToday ? "text-primary" : "text-gray-900"
                  }`}
                >
                  {date.getDate()}
                </div>
              </div>
              <div className="space-y-2">
                {dayActivities.map((activity) => (
                  <Link
                    key={activity.id}
                    href={`/activities/${activity.id}`}
                    className={`block rounded-lg border p-2 text-sm hover:bg-gray-50 ${
                      activity.completed
                        ? "border-gray-200 bg-gray-50 text-gray-500 line-through"
                        : "border-blue-200 bg-blue-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ActivityTypeIcon type={activity.type} />
                      <span className="truncate font-medium">
                        {activity.subject}
                      </span>
                    </div>
                  </Link>
                ))}
                {dayActivities.length === 0 && (
                  <div className="py-4 text-center text-xs text-gray-400">
                    Sem atividades
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const render3DayView = () => {
    const days = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date(selectedDate);
      date.setDate(selectedDate.getDate() - 1 + i);
      days.push(date);
    }

    return (
      <div className="grid grid-cols-3 gap-4">
        {days.map((date, index) => {
          const dayActivities = getActivitiesForDate(date);
          const isToday =
            date.getDate() === new Date().getDate() &&
            date.getMonth() === new Date().getMonth() &&
            date.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={index}
              className={`rounded-lg border bg-white p-4 ${
                isToday ? "ring-2 ring-primary" : "border-gray-200"
              }`}
            >
              <div className="mb-4 text-center">
                <div className="text-sm font-medium text-gray-500">
                  {dayNames[date.getDay()]}
                </div>
                <div
                  className={`text-3xl font-bold ${
                    isToday ? "text-primary" : "text-gray-900"
                  }`}
                >
                  {date.getDate()}
                </div>
                <div className="text-xs text-gray-500">
                  {monthNames[date.getMonth()]}
                </div>
              </div>
              <div className="space-y-2">
                {dayActivities.map((activity) => (
                  <Link
                    key={activity.id}
                    href={`/activities/${activity.id}`}
                    className={`block rounded-lg border p-3 hover:bg-gray-50 ${
                      activity.completed
                        ? "border-gray-200 bg-gray-50 text-gray-500"
                        : "border-blue-200 bg-blue-50"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <ActivityTypeIcon type={activity.type} />
                      <span
                        className={`font-medium ${
                          activity.completed ? "line-through" : ""
                        }`}
                      >
                        {activity.subject}
                      </span>
                    </div>
                  </Link>
                ))}
                {dayActivities.length === 0 && (
                  <div className="py-8 text-center text-sm text-gray-400">
                    Sem atividades
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayActivities = getActivitiesForDate(selectedDate);
    const isToday =
      selectedDate.getDate() === new Date().getDate() &&
      selectedDate.getMonth() === new Date().getMonth() &&
      selectedDate.getFullYear() === new Date().getFullYear();

    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 rounded-lg border bg-white p-6 text-center">
          <div className="text-lg font-medium text-gray-500">
            {dayNames[selectedDate.getDay()]}
          </div>
          <div
            className={`text-6xl font-bold ${
              isToday ? "text-primary" : "text-gray-900"
            }`}
          >
            {selectedDate.getDate()}
          </div>
          <div className="text-xl text-gray-500">
            {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </div>
        </div>

        <div className="space-y-3">
          {dayActivities.length > 0 ? (
            dayActivities.map((activity) => (
              <Link
                key={activity.id}
                href={`/activities/${activity.id}`}
                className={`block rounded-lg border p-4 transition-all hover:shadow-md ${
                  activity.completed
                    ? "border-gray-200 bg-white hover:bg-gray-50"
                    : "border-primary/20 bg-white hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {activity.completed ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                        <svg
                          className="h-5 w-5 text-green-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <ActivityTypeIcon type={activity.type} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`text-base font-semibold ${
                        activity.completed
                          ? "text-gray-500 line-through"
                          : "text-gray-900"
                      }`}
                    >
                      {activity.subject}
                    </h3>
                    {(() => {
                      const context = getActivityContext(activity);
                      return (
                        <>
                          {context.company && (
                            <p className="mt-1 text-sm font-medium text-gray-700">
                              {context.company}
                            </p>
                          )}
                          {context.contact && (
                            <p className="mt-0.5 text-xs text-gray-500">
                              {context.contact}
                            </p>
                          )}
                        </>
                      );
                    })()}
                    {activity.completed && (
                      <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        ✓ Concluída
                      </span>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-500">
                Nenhuma atividade agendada para este dia
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getPeriodTitle = () => {
    if (view === "month") {
      return `${monthNames[currentMonth]} ${currentYear}`;
    } else if (view === "week") {
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} ${
        monthNames[startOfWeek.getMonth()]
      } ${startOfWeek.getFullYear()}`;
    } else if (view === "3day") {
      const start = new Date(selectedDate);
      start.setDate(selectedDate.getDate() - 1);
      const end = new Date(selectedDate);
      end.setDate(selectedDate.getDate() + 1);
      return `${start.getDate()} - ${end.getDate()} ${
        monthNames[start.getMonth()]
      } ${start.getFullYear()}`;
    } else {
      return `${selectedDate.getDate()} ${
        monthNames[selectedDate.getMonth()]
      } ${selectedDate.getFullYear()}`;
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{getPeriodTitle()}</h2>
        <div className="flex gap-2">
          <div className="flex rounded-md border border-gray-300">
            <button
              onClick={() => handleViewChange("month")}
              className={`px-3 py-2 text-sm font-medium ${
                view === "month"
                  ? "bg-primary text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => handleViewChange("week")}
              className={`border-l border-gray-300 px-3 py-2 text-sm font-medium ${
                view === "week"
                  ? "bg-primary text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => handleViewChange("3day")}
              className={`border-l border-gray-300 px-3 py-2 text-sm font-medium ${
                view === "3day"
                  ? "bg-primary text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              3 Dias
            </button>
            <button
              onClick={() => handleViewChange("day")}
              className={`border-l border-gray-300 px-3 py-2 text-sm font-medium ${
                view === "day"
                  ? "bg-primary text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Dia
            </button>
          </div>
          <button
            onClick={handleToday}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hoje
          </button>
          <button
            onClick={handlePrevPeriod}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ←
          </button>
          <button
            onClick={handleNextPeriod}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            →
          </button>
        </div>
      </div>

      {view === "month" && renderMonthView()}
      {view === "week" && renderWeekView()}
      {view === "3day" && render3DayView()}
      {view === "day" && renderDayView()}
    </div>
  );
}
