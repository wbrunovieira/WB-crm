"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface WeeklyWindow { weekday: number; start: string; end: string }
interface PresentialCity { city: string; state?: string }
interface BookingType {
  id: string; name: string; durationMinutes: number; bufferMinutes: number;
  minNoticeHours: number; maxAdvanceDays: number; timeZone: string;
  weeklyHours: WeeklyWindow[]; presentialCities: PresentialCity[]; active: boolean;
}

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
type DayRow = { enabled: boolean; start: string; end: string };

const DEFAULT_WEEK: DayRow[] = [
  { enabled: false, start: "09:00", end: "18:00" }, // Dom
  { enabled: true, start: "09:00", end: "18:00" },
  { enabled: true, start: "09:00", end: "18:00" },
  { enabled: true, start: "09:00", end: "18:00" },
  { enabled: true, start: "09:00", end: "18:00" },
  { enabled: true, start: "09:00", end: "18:00" },
  { enabled: true, start: "08:00", end: "12:00" }, // Sáb
];

const inputCls = "rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

export function SchedulingConfigForm() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState("Reunião 30min");
  const [durationMinutes, setDuration] = useState(30);
  const [bufferMinutes, setBuffer] = useState(15);
  const [minNoticeHours, setNotice] = useState(4);
  const [maxAdvanceDays, setAdvance] = useState(14);
  const [timeZone, setTimeZone] = useState("America/Sao_Paulo");
  const [week, setWeek] = useState<DayRow[]>(DEFAULT_WEEK);
  const [cities, setCities] = useState<PresentialCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ bookingTypes: BookingType[] }>("/scheduling/booking-types", token)
      .then((data) => {
        const bt = data.bookingTypes?.[0];
        if (bt) {
          setId(bt.id); setName(bt.name); setDuration(bt.durationMinutes); setBuffer(bt.bufferMinutes);
          setNotice(bt.minNoticeHours); setAdvance(bt.maxAdvanceDays); setTimeZone(bt.timeZone);
          setCities(bt.presentialCities ?? []);
          const w = DEFAULT_WEEK.map((d) => ({ ...d, enabled: false }));
          for (const wh of bt.weeklyHours ?? []) w[wh.weekday] = { enabled: true, start: wh.start, end: wh.end };
          setWeek(w);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  function setDay(i: number, patch: Partial<DayRow>) {
    setWeek((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  async function save() {
    setSaving(true);
    const weeklyHours: WeeklyWindow[] = week.map((d, i) => ({ ...d, weekday: i })).filter((d) => d.enabled).map((d) => ({ weekday: d.weekday, start: d.start, end: d.end }));
    const presentialCities = cities.filter((c) => c.city.trim());
    const body = { name, durationMinutes, bufferMinutes, minNoticeHours, maxAdvanceDays, timeZone, weeklyHours, presentialCities };
    try {
      if (id) {
        await apiFetch(`/scheduling/booking-types/${id}`, token, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        const created = await apiFetch<{ bookingType: BookingType }>("/scheduling/booking-types", token, { method: "POST", body: JSON.stringify(body) });
        setId(created.bookingType.id);
      }
      toast.success("Configuração de agendamento salva!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <label className="block text-sm font-medium text-gray-700">Nome da reunião</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} mt-1 w-full`} />
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Duração (min)" value={durationMinutes} onChange={setDuration} />
          <Field label="Buffer (min)" value={bufferMinutes} onChange={setBuffer} />
          <Field label="Antecedência (h)" value={minNoticeHours} onChange={setNotice} />
          <Field label="Janela (dias)" value={maxAdvanceDays} onChange={setAdvance} />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Fuso horário</label>
          <input value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className={`${inputCls} mt-1 w-full sm:w-72`} />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-gray-900">Horários de atendimento</h3>
        <div className="space-y-2">
          {week.map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <label className="flex w-28 items-center gap-2 text-sm">
                <input type="checkbox" checked={d.enabled} onChange={(e) => setDay(i, { enabled: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                {DAYS[i]}
              </label>
              <input type="time" value={d.start} disabled={!d.enabled} onChange={(e) => setDay(i, { start: e.target.value })} className={`${inputCls} w-28 disabled:opacity-40`} />
              <span className="text-gray-400">às</span>
              <input type="time" value={d.end} disabled={!d.enabled} onChange={(e) => setDay(i, { end: e.target.value })} className={`${inputCls} w-28 disabled:opacity-40`} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="mb-1 font-semibold text-gray-900">Cidades com atendimento presencial</h3>
        <p className="mb-3 text-sm text-gray-500">Leads dessas cidades poderão escolher reunião presencial. As demais veem só online.</p>
        <div className="space-y-2">
          {cities.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={c.city} placeholder="Cidade" onChange={(e) => setCities((p) => p.map((x, idx) => idx === i ? { ...x, city: e.target.value } : x))} className={`${inputCls} flex-1`} />
              <input value={c.state ?? ""} placeholder="UF" maxLength={2} onChange={(e) => setCities((p) => p.map((x, idx) => idx === i ? { ...x, state: e.target.value.toUpperCase() } : x))} className={`${inputCls} w-20`} />
              <button type="button" onClick={() => setCities((p) => p.filter((_, idx) => idx !== i))} className="rounded-md p-2 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
            </div>
          ))}
          <button type="button" onClick={() => setCities((p) => [...p, { city: "", state: "" }])} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><Plus size={14} /> Adicionar cidade</button>
        </div>
      </div>

      <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-white hover:bg-purple-700 disabled:opacity-50">
        {saving ? "Salvando..." : "Salvar configuração"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} className={`${inputCls} mt-1 w-full`} />
    </div>
  );
}
