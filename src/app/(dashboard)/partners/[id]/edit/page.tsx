import { getPartnerById } from "@/actions/partners";
import { PartnerForm } from "@/components/partners/PartnerForm";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function EditPartnerPage({
  params,
}: {
  params: { id: string };
}) {
  const partner = await getPartnerById(params.id);

  if (!partner) {
    notFound();
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Editar Parceiro</h1>
          <p className="mt-2 text-gray-600">
            Atualize as informações do parceiro
          </p>
        </div>
        <Link
          href={`/partners/${params.id}`}
          className="rounded-md border border-gray-300 p-2 text-gray-700 hover:bg-gray-50"
          title="Voltar"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </Link>
      </div>

      <div className="max-w-3xl rounded-lg bg-white p-6 shadow">
        <PartnerForm partner={partner} />
      </div>
    </div>
  );
}
