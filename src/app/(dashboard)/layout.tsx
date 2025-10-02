import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Toaster } from "sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#350045' }}>
      <Toaster position="top-right" richColors />
      <nav className="border-b" style={{ backgroundColor: '#1a0022', borderColor: '#792990' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-xl font-bold text-primary">
                WB CRM
              </Link>
              <div className="hidden space-x-4 md:flex">
                <Link
                  href="/dashboard"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-200 hover:bg-purple-900 hover:text-white"
                >
                  Dashboard
                </Link>
                <Link
                  href="/contacts"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-200 hover:bg-purple-900 hover:text-white"
                >
                  Contatos
                </Link>
                <Link
                  href="/organizations"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-200 hover:bg-purple-900 hover:text-white"
                >
                  Organizações
                </Link>
                <Link
                  href="/pipelines"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-200 hover:bg-purple-900 hover:text-white"
                >
                  Pipelines
                </Link>
                <Link
                  href="/deals"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-200 hover:bg-purple-900 hover:text-white"
                >
                  Negócios
                </Link>
                <Link
                  href="/pipeline"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-200 hover:bg-purple-900 hover:text-white"
                >
                  Pipeline
                </Link>
                <Link
                  href="/activities"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-200 hover:bg-purple-900 hover:text-white"
                >
                  Atividades
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-200">{session.user?.name || session.user?.email}</span>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
