import { getActivities } from "@/actions/activities";
import ActivityCalendar from "@/components/activities/ActivityCalendar";
import Link from "next/link";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string };
}) {
  const now = new Date();
  const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth();
  const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();

  const activities = await getActivities();

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendário de Atividades</h1>
          <p className="mt-2 text-gray-600">
            Visualize suas atividades em formato de calendário
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/activities"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Ver Lista
          </Link>
          <Link
            href="/activities/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Nova Atividade
          </Link>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <ActivityCalendar
          activities={activities}
          currentMonth={month}
          currentYear={year}
        />
      </div>
    </div>
  );
}
