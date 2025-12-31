import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getManagerStats } from "@/actions/admin-manager";
import { ManagerDashboard } from "@/components/admin/manager";
import { type PeriodOption } from "@/lib/validations/manager";

interface PageProps {
  searchParams: Promise<{
    period?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function ManagerPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Only admin can access
  if (session.user.role?.toLowerCase() !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const period = (params.period as PeriodOption) || "month";
  const startDate = params.startDate;
  const endDate = params.endDate;

  // Fetch stats
  const stats = await getManagerStats({
    period,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
      <ManagerDashboard
        stats={stats}
        currentPeriod={period}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}

export const metadata = {
  title: "Gerenciador | Admin | WB CRM",
  description: "Dashboard de gerenciamento e métricas de usuários",
};
