import { TechStackManager } from "@/components/admin/TechStackManager";
import Link from "next/link";

export default function TechStackPage() {
  return (
    <div className="p-8">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          ← Voltar para Admin
        </Link>
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Tech Stack</h1>
        <p className="mt-2 text-gray-600">
          Gerencie categorias, linguagens e frameworks do sistema
        </p>
      </div>

      <TechStackManager />
    </div>
  );
}
