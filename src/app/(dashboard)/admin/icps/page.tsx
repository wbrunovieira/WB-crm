import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getICPs } from "@/actions/icps";
import { ICPForm } from "@/components/admin/ICPForm";
import { ICPsList } from "@/components/admin/ICPsList";

export default async function ICPsPage() {
  const icps = await getICPs();

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Admin
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Perfis de Cliente Ideal (ICPs)
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie os perfis de cliente ideal para categorizar leads e organizações.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <ICPForm />
        <ICPsList icps={icps} />
      </div>
    </div>
  );
}
