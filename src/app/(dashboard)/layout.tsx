import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Toaster } from "sonner";
import { LogoutButton } from "@/components/shared/LogoutButton";
import { MainNav } from "@/components/shared/MainNav";

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
      <nav className="sticky top-0 z-50 border-b shadow-lg" style={{ backgroundColor: '#1a0022', borderColor: '#792990' }}>
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-6 min-w-0 flex-1">
              <Link href="/dashboard" className="flex-shrink-0 text-xl font-bold text-primary hover:text-purple-400 transition-colors">
                WB CRM
              </Link>
              <MainNav />
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="hidden sm:block text-sm text-gray-300 font-medium truncate max-w-[200px]" title={session.user?.name || session.user?.email || ""}>
                {session.user?.name || session.user?.email}
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
