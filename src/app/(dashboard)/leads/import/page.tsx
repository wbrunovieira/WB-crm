import { ImportWizard } from "@/components/leads/import/ImportWizard";

export default function ImportLeadsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-200">Importar Leads</h1>
        <p className="mt-2 text-gray-400">
          Importe leads em massa a partir de arquivos CSV ou Excel
        </p>
      </div>

      <ImportWizard />
    </div>
  );
}
