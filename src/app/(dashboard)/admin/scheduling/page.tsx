import { SchedulingConfigForm } from "@/components/admin/SchedulingConfigForm";

export default function AdminSchedulingPage() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Agendamento</h1>
      <p className="mt-1 mb-6 text-gray-600">
        Configure como os leads agendam reuniões com você (horários, duração e atendimento presencial).
      </p>
      <SchedulingConfigForm />
    </div>
  );
}
