import { TechProfileManager } from "@/components/admin/TechProfileManager";
import Link from "next/link";

export default function TechProfilePage() {
  return (
    <div className="p-8">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          ← Voltar para Admin
        </Link>
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Tech Profile</h1>
        <p className="mt-2 text-gray-600">
          Gerencie opções de perfil tecnológico para rastrear a stack atual dos Leads e Organizations
        </p>
      </div>

      <TechProfileManager />
    </div>
  );
}
