"use client";

import { useState, useCallback } from "react";
import { X, Pencil, Loader2, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

/* ─── Shared modal chrome ─────────────────────────────────────── */

function Modal({ title, onClose, onSave, saving, children }: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-[#3d2b4d] bg-[#1a0022] shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#3d2b4d] px-5 py-4 flex-shrink-0">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {children}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#3d2b4d] px-5 py-4 flex-shrink-0">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white">
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function PencilButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-auto rounded p-1 text-gray-500 hover:text-purple-400 hover:bg-purple-900/20 transition-colors"
      title="Editar seção"
    >
      <Pencil size={12} />
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-400">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none";
const selectCls = inputCls + " cursor-pointer";

function useLeadEdit(leadId: string) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const save = useCallback(async (payload: Record<string, unknown>, onSuccess?: () => void) => {
    setSaving(true);
    try {
      await apiFetch(`/leads/${leadId}`, token, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      toast.success("Alterações salvas.");
      onSuccess?.();
      router.refresh();
    } catch {
      toast.error("Erro ao salvar alterações.");
    } finally {
      setSaving(false);
    }
  }, [leadId, token, router]);

  return { save, saving };
}

/* ─── 1. Informações Básicas ──────────────────────────────────── */

type InfoBasicaProps = {
  leadId: string;
  businessName: string;
  registeredName?: string | null;
  companyRegistrationID?: string | null;
  foundationDate?: string | null;
  segment?: string | null;
  description?: string | null;
  status: string;
  quality?: string | null;
};

export function LeadEditInfoBasica(props: InfoBasicaProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    businessName: props.businessName,
    registeredName: props.registeredName ?? "",
    companyRegistrationID: props.companyRegistrationID ?? "",
    foundationDate: props.foundationDate ? props.foundationDate.slice(0, 10) : "",
    segment: props.segment ?? "",
    description: props.description ?? "",
    status: props.status,
    quality: props.quality ?? "",
  });
  const { save, saving } = useLeadEdit(props.leadId);

  function handleSave() {
    save({
      businessName: form.businessName.trim() || undefined,
      registeredName: form.registeredName.trim() || null,
      companyRegistrationID: form.companyRegistrationID.trim() || null,
      foundationDate: form.foundationDate || null,
      segment: form.segment.trim() || null,
      description: form.description.trim() || null,
      status: form.status,
      quality: form.quality || null,
    }, () => setOpen(false));
  }

  return (
    <>
      <PencilButton onClick={() => setOpen(true)} />
      {open && (
        <Modal title="Editar Informações Básicas" onClose={() => setOpen(false)} onSave={handleSave} saving={saving}>
          <Field label="Nome Comercial *">
            <input className={inputCls} value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
          </Field>
          <Field label="Razão Social">
            <input className={inputCls} value={form.registeredName} onChange={(e) => setForm({ ...form, registeredName: e.target.value })} />
          </Field>
          <Field label="CNPJ">
            <input className={inputCls} value={form.companyRegistrationID} onChange={(e) => setForm({ ...form, companyRegistrationID: e.target.value })} placeholder="00.000.000/0000-00" />
          </Field>
          <Field label="Data de Fundação">
            <input type="date" className={inputCls + " [color-scheme:dark]"} value={form.foundationDate} onChange={(e) => setForm({ ...form, foundationDate: e.target.value })} />
          </Field>
          <Field label="Segmento">
            <input className={inputCls} value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} />
          </Field>
          <Field label="Status">
            <select className={selectCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="new">Novo</option>
              <option value="contacted">Contatado</option>
              <option value="qualified">Qualificado</option>
              <option value="disqualified">Desqualificado</option>
            </select>
          </Field>
          <Field label="Temperatura">
            <select className={selectCls} value={form.quality} onChange={(e) => setForm({ ...form, quality: e.target.value })}>
              <option value="">Sem temperatura</option>
              <option value="hot">Quente</option>
              <option value="warm">Morno</option>
              <option value="cold">Frio</option>
            </select>
          </Field>
          <Field label="Descrição">
            <textarea className={inputCls} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </Modal>
      )}
    </>
  );
}

/* ─── 2. Contato da Empresa ───────────────────────────────────── */

type ContatoProps = {
  leadId: string;
  phone?: string | null;
  phone2?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
};

export function LeadEditContato(props: ContatoProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    phone: props.phone ?? "",
    phone2: props.phone2 ?? "",
    whatsapp: props.whatsapp ?? "",
    email: props.email ?? "",
    website: props.website ?? "",
  });
  const { save, saving } = useLeadEdit(props.leadId);

  function handleSave() {
    save({
      phone: form.phone.trim() || null,
      phone2: form.phone2.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
    }, () => setOpen(false));
  }

  return (
    <>
      <PencilButton onClick={() => setOpen(true)} />
      {open && (
        <Modal title="Editar Contato da Empresa" onClose={() => setOpen(false)} onSave={handleSave} saving={saving}>
          <Field label="Telefone">
            <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+55 11 99999-9999" />
          </Field>
          <Field label="Telefone 2">
            <input className={inputCls} value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} placeholder="+55 11 99999-9999" />
          </Field>
          <Field label="WhatsApp">
            <input className={inputCls} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+55 11 99999-9999" />
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.com" />
          </Field>
          <Field label="Website">
            <input className={inputCls} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://empresa.com.br" />
          </Field>
        </Modal>
      )}
    </>
  );
}

/* ─── 3. Localização ──────────────────────────────────────────── */

type LocalizacaoProps = {
  leadId: string;
  address?: string | null;
  vicinity?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
};

export function LeadEditLocalizacao(props: LocalizacaoProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    address: props.address ?? "",
    vicinity: props.vicinity ?? "",
    city: props.city ?? "",
    state: props.state ?? "",
    country: props.country ?? "",
    zipCode: props.zipCode ?? "",
  });
  const { save, saving } = useLeadEdit(props.leadId);

  function handleSave() {
    save({
      address: form.address.trim() || null,
      vicinity: form.vicinity.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      country: form.country.trim() || null,
      zipCode: form.zipCode.trim() || null,
    }, () => setOpen(false));
  }

  return (
    <>
      <PencilButton onClick={() => setOpen(true)} />
      {open && (
        <Modal title="Editar Localização" onClose={() => setOpen(false)} onSave={handleSave} saving={saving}>
          <Field label="Endereço">
            <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="Bairro / Região">
            <input className={inputCls} value={form.vicinity} onChange={(e) => setForm({ ...form, vicinity: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cidade">
              <input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="Estado">
              <input className={inputCls} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="SP" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="País">
              <input className={inputCls} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Brasil" />
            </Field>
            <Field label="CEP">
              <input className={inputCls} value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} placeholder="00000-000" />
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ─── 4. Informações da Empresa ───────────────────────────────── */

type EmpresaProps = {
  leadId: string;
  companyOwner?: string | null;
  companySize?: string | null;
  employeesCount?: number | null;
  revenue?: number | null;
  revenueRange?: string | null;
  equityCapital?: number | null;
  businessStatus?: string | null;
  legalNature?: string | null;
  branchType?: string | null;
  simplesNacional?: boolean | null;
  isMei?: boolean | null;
};

export function LeadEditEmpresa(props: EmpresaProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    companyOwner: props.companyOwner ?? "",
    companySize: props.companySize ?? "",
    employeesCount: props.employeesCount != null ? String(props.employeesCount) : "",
    revenue: props.revenue != null ? String(props.revenue) : "",
    revenueRange: props.revenueRange ?? "",
    equityCapital: props.equityCapital != null ? String(props.equityCapital) : "",
    businessStatus: props.businessStatus ?? "",
    legalNature: props.legalNature ?? "",
    branchType: props.branchType ?? "",
    simplesNacional: props.simplesNacional != null ? String(props.simplesNacional) : "",
    isMei: props.isMei != null ? String(props.isMei) : "",
  });
  const { save, saving } = useLeadEdit(props.leadId);

  function handleSave() {
    save({
      companyOwner: form.companyOwner.trim() || null,
      companySize: form.companySize.trim() || null,
      employeesCount: form.employeesCount ? Number(form.employeesCount) : null,
      revenue: form.revenue ? Number(form.revenue) : null,
      revenueRange: form.revenueRange.trim() || null,
      equityCapital: form.equityCapital ? Number(form.equityCapital) : null,
      businessStatus: form.businessStatus.trim() || null,
      legalNature: form.legalNature.trim() || null,
      branchType: form.branchType.trim() || null,
      simplesNacional: form.simplesNacional === "true" ? true : form.simplesNacional === "false" ? false : null,
      isMei: form.isMei === "true" ? true : form.isMei === "false" ? false : null,
    }, () => setOpen(false));
  }

  return (
    <>
      <PencilButton onClick={() => setOpen(true)} />
      {open && (
        <Modal title="Editar Informações da Empresa" onClose={() => setOpen(false)} onSave={handleSave} saving={saving}>
          <Field label="Proprietário / Sócio">
            <input className={inputCls} value={form.companyOwner} onChange={(e) => setForm({ ...form, companyOwner: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Porte">
              <select className={selectCls} value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })}>
                <option value="">—</option>
                <option value="MEI">MEI</option>
                <option value="ME">ME</option>
                <option value="EPP">EPP</option>
                <option value="Médio">Médio</option>
                <option value="Grande">Grande</option>
              </select>
            </Field>
            <Field label="Funcionários">
              <input type="number" className={inputCls} value={form.employeesCount} onChange={(e) => setForm({ ...form, employeesCount: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Receita Anual (R$)">
              <input type="number" className={inputCls} value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} />
            </Field>
            <Field label="Faixa de Faturamento">
              <input className={inputCls} value={form.revenueRange} onChange={(e) => setForm({ ...form, revenueRange: e.target.value })} placeholder="Ex: 360k–4,8M" />
            </Field>
          </div>
          <Field label="Capital Social (R$)">
            <input type="number" className={inputCls} value={form.equityCapital} onChange={(e) => setForm({ ...form, equityCapital: e.target.value })} />
          </Field>
          <Field label="Situação Cadastral">
            <input className={inputCls} value={form.businessStatus} onChange={(e) => setForm({ ...form, businessStatus: e.target.value })} placeholder="Ativa, Baixada..." />
          </Field>
          <Field label="Natureza Jurídica">
            <input className={inputCls} value={form.legalNature} onChange={(e) => setForm({ ...form, legalNature: e.target.value })} />
          </Field>
          <Field label="Matriz / Filial">
            <select className={selectCls} value={form.branchType} onChange={(e) => setForm({ ...form, branchType: e.target.value })}>
              <option value="">—</option>
              <option value="Matriz">Matriz</option>
              <option value="Filial">Filial</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Simples Nacional">
              <select className={selectCls} value={form.simplesNacional} onChange={(e) => setForm({ ...form, simplesNacional: e.target.value })}>
                <option value="">—</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </Field>
            <Field label="MEI">
              <select className={selectCls} value={form.isMei} onChange={(e) => setForm({ ...form, isMei: e.target.value })}>
                <option value="">—</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ─── 5. Redes Sociais ────────────────────────────────────────── */

type RedesProps = {
  leadId: string;
  instagram?: string | null;
  linkedin?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
};

export function LeadEditRedes(props: RedesProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    instagram: props.instagram ?? "",
    linkedin: props.linkedin ?? "",
    facebook: props.facebook ?? "",
    twitter: props.twitter ?? "",
    tiktok: props.tiktok ?? "",
  });
  const { save, saving } = useLeadEdit(props.leadId);

  function handleSave() {
    save({
      instagram: form.instagram.trim() || null,
      linkedin: form.linkedin.trim() || null,
      facebook: form.facebook.trim() || null,
      twitter: form.twitter.trim() || null,
      tiktok: form.tiktok.trim() || null,
    }, () => setOpen(false));
  }

  return (
    <>
      <PencilButton onClick={() => setOpen(true)} />
      {open && (
        <Modal title="Editar Redes Sociais" onClose={() => setOpen(false)} onSave={handleSave} saving={saving}>
          <Field label="Instagram">
            <input className={inputCls} value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@empresa ou URL" />
          </Field>
          <Field label="LinkedIn">
            <input className={inputCls} value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} placeholder="URL ou /company/nome" />
          </Field>
          <Field label="Facebook">
            <input className={inputCls} value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} placeholder="URL ou /nome" />
          </Field>
          <Field label="Twitter / X">
            <input className={inputCls} value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} placeholder="@handle ou URL" />
          </Field>
          <Field label="TikTok">
            <input className={inputCls} value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} placeholder="@handle ou URL" />
          </Field>
        </Modal>
      )}
    </>
  );
}
