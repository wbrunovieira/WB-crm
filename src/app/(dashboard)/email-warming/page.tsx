import { backendFetch } from "@/lib/backend/client";
import { EmailWarmingView } from "@/components/email-warming/EmailWarmingView";

export const metadata = { title: "Aquecimento de Email | WB CRM" };

interface AccountStatus {
  id: string;
  email: string;
  isActive: boolean;
  phase: string;
  startedAt: string;
  daysSinceStart: number;
  dailyVolume: number;
  todaySentCount: number;
}

interface PoolEmail {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
}

interface WarmingSendItem {
  id: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  isAutoReply: boolean;
  sentAt: string;
}

export default async function EmailWarmingPage() {
  const [statusData, poolEmails, historyData] = await Promise.all([
    backendFetch<{ accounts: AccountStatus[] }>("/warming/status").catch(() => ({ accounts: [] })),
    backendFetch<PoolEmail[]>("/warming/pool").catch(() => [] as PoolEmail[]),
    backendFetch<{ total: number; page: number; sends: WarmingSendItem[] }>("/warming/history?page=1&pageSize=30").catch(() => ({ total: 0, page: 1, sends: [] })),
  ]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-200">Aquecimento de Email</h1>
        <p className="mt-2 text-gray-400">
          Construa e mantenha a reputação dos seus domínios enviando emails de aquecimento automaticamente
        </p>
      </div>

      <EmailWarmingView
        accounts={statusData.accounts}
        poolEmails={poolEmails}
        history={historyData.sends}
        historyTotal={historyData.total}
      />
    </div>
  );
}
