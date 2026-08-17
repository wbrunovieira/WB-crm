import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Linking, Alert } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  getLeadDetail,
  getLeadContacts,
  updateLead,
  addLeadContact,
  updateLeadContact,
  createVisitActivity,
  type LeadDetail,
  type LeadContact,
  type LeadEditPatch,
  type ContactEditPatch,
  type ContactType,
} from "@/lib/leads";

interface EditState {
  businessName: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  website: string;
}

function toEditState(lead: LeadDetail): EditState {
  return {
    businessName: lead.businessName ?? "",
    phone: lead.phone ?? "",
    whatsapp: lead.whatsapp ?? "",
    address: lead.address ?? "",
    city: lead.city ?? "",
    state: lead.state ?? "",
    zipCode: lead.zipCode ?? "",
    website: lead.website ?? "",
  };
}

/** Only the fields that actually changed vs. the loaded lead — a partial PATCH. */
function diffPatch(lead: LeadDetail, edit: EditState): LeadEditPatch {
  const patch: LeadEditPatch = {};
  const orig = toEditState(lead);
  (Object.keys(edit) as (keyof EditState)[]).forEach((key) => {
    if (edit[key].trim() !== orig[key].trim()) patch[key] = edit[key].trim();
  });
  return patch;
}

function digits(s: string): string {
  return s.replace(/\D/g, "");
}

/** `tel:` needs the leading "+" to be recognized as an international number — stripping it
 *  (like wa.me's digits-only format wants) makes iOS silently fail to place the call. Phones
 *  are stored E.164 (+55...) so the "+" is normally there; preserved if present, omitted only
 *  for genuinely local/malformed numbers that never had one. */
function telHref(raw: string): string {
  return `tel:${raw.trim().startsWith("+") ? "+" : ""}${digits(raw)}`;
}

function contactsKey(id: string) {
  return ["lead-contacts", id];
}

export default function LeadDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [addingContact, setAddingContact] = useState(false);
  const [loggingVisit, setLoggingVisit] = useState(false);
  const [visitNotes, setVisitNotes] = useState("");
  const [visitContactType, setVisitContactType] = useState<ContactType | "">("");

  const detailQuery = useQuery({ queryKey: ["lead-detail", id], queryFn: () => getLeadDetail(id) });
  const contactsQuery = useQuery({ queryKey: ["lead-contacts", id], queryFn: () => getLeadContacts(id) });

  const saveMutation = useMutation({
    mutationFn: (patch: LeadEditPatch) => updateLead(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-detail", id] });
      setEditing(false);
      setEdit(null);
    },
    onError: () => Alert.alert("Erro", "Não foi possível salvar. Tente novamente."),
  });

  const visitMutation = useMutation({
    mutationFn: (vars: { businessName: string; notes: string; contactType: ContactType | "" }) =>
      createVisitActivity(id, vars.businessName, vars.notes || undefined, vars.contactType || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-detail", id] });
      setLoggingVisit(false);
      setVisitNotes("");
      setVisitContactType("");
      Alert.alert("Visita registrada", "A visita foi registrada com sucesso.");
    },
    onError: () => Alert.alert("Erro", "Não foi possível registrar a visita. Tente novamente."),
  });

  if (detailQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c9b3d6" size="large" />
      </View>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Não foi possível carregar o lead.</Text>
      </View>
    );
  }

  const lead = detailQuery.data;
  const contacts = contactsQuery.data ?? [];
  const activities = [...(lead.activities ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);

  function startEdit() {
    setEdit(toEditState(lead));
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setEdit(null);
  }

  function save() {
    if (!edit) return;
    if (!edit.businessName.trim()) {
      Alert.alert("Nome do negócio", "O nome do negócio não pode ficar em branco.");
      return;
    }
    const patch = diffPatch(lead, edit);
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      setEdit(null);
      return;
    }
    saveMutation.mutate(patch);
  }

  const setField = <K extends keyof EditState>(key: K, value: string) =>
    setEdit((p) => (p ? { ...p, [key]: value } : p));

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Text style={styles.name}>{lead.businessName}</Text>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{lead.status}</Text>
        </View>
        {!!lead.quality && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>⭐ {lead.quality}</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.section}>Informações</Text>
          {!editing ? (
            <Pressable onPress={startEdit} hitSlop={8}>
              <Text style={styles.editLink}>✏️ Editar</Text>
            </Pressable>
          ) : (
            <View style={styles.editActions}>
              <Pressable onPress={cancelEdit} hitSlop={8} disabled={saveMutation.isPending}>
                <Text style={styles.cancelLink}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={save} hitSlop={8} disabled={saveMutation.isPending}>
                <Text style={styles.saveLink}>{saveMutation.isPending ? "Salvando…" : "💾 Salvar"}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {!editing || !edit ? (
          <View style={styles.readRows}>
            <InfoRow label="Endereço" value={[lead.address, lead.city, lead.state, lead.zipCode].filter(Boolean).join(", ")} />
            <InfoRow label="Telefone" value={lead.phone} kind="phone" />
            <InfoRow label="WhatsApp" value={lead.whatsapp} kind="whatsapp" />
            <InfoRow label="Site" value={lead.website} kind="url" />
          </View>
        ) : (
          <View style={styles.readRows}>
            <Field label="Nome do negócio" value={edit.businessName} onChangeText={(v) => setField("businessName", v)} />
            <Field label="Endereço" value={edit.address} onChangeText={(v) => setField("address", v)} />
            <View style={styles.row}>
              <View style={styles.grow}>
                <Field label="Cidade" value={edit.city} onChangeText={(v) => setField("city", v)} />
              </View>
              <View style={styles.uf}>
                <Field label="UF" value={edit.state} onChangeText={(v) => setField("state", v)} autoCapitalize="characters" maxLength={2} />
              </View>
            </View>
            <Field label="CEP" value={edit.zipCode} onChangeText={(v) => setField("zipCode", v)} keyboardType="numbers-and-punctuation" />
            <Field label="Telefone" value={edit.phone} onChangeText={(v) => setField("phone", v)} keyboardType="phone-pad" />
            <Field label="WhatsApp" value={edit.whatsapp} onChangeText={(v) => setField("whatsapp", v)} keyboardType="phone-pad" />
            <Field label="Site" value={edit.website} onChangeText={(v) => setField("website", v)} autoCapitalize="none" keyboardType="url" />
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.section}>Contatos ({contacts.length})</Text>
          {!addingContact && (
            <Pressable onPress={() => setAddingContact(true)} hitSlop={8}>
              <Text style={styles.editLink}>+ Novo contato</Text>
            </Pressable>
          )}
        </View>
        {contactsQuery.isLoading && <ActivityIndicator color="#c9b3d6" style={{ marginTop: 8 }} />}
        {contactsQuery.isError && <Text style={styles.errorText}>Não foi possível carregar os contatos.</Text>}
        {!contactsQuery.isLoading && !contactsQuery.isError && contacts.length === 0 && !addingContact && (
          <Text style={styles.empty}>Nenhum contato registrado.</Text>
        )}
        {contacts.map((c) => (
          <ContactRow key={c.id} leadId={id} contact={c} queryClient={queryClient} />
        ))}
        {addingContact && <NewContactForm leadId={id} queryClient={queryClient} onDone={() => setAddingContact(false)} />}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.section}>Visita</Text>
          {!loggingVisit && (
            <Pressable onPress={() => setLoggingVisit(true)} hitSlop={8}>
              <Text style={styles.editLink}>📍 Registrar visita</Text>
            </Pressable>
          )}
        </View>
        {!loggingVisit ? (
          <Text style={styles.empty}>Registre a visita porta a porta e o que foi conversado.</Text>
        ) : (
          <View style={styles.readRows}>
            <Field
              label="O que conversamos / pontos de interesse"
              value={visitNotes}
              onChangeText={setVisitNotes}
              placeholder="Anote os pontos que o cliente se interessou"
              multiline
            />
            <View style={styles.chipsRow}>
              <Chip
                label="Decisor"
                active={visitContactType === "decisor"}
                onPress={() => setVisitContactType(visitContactType === "decisor" ? "" : "decisor")}
              />
              <Chip
                label="Atendente"
                active={visitContactType === "gatekeeper"}
                onPress={() => setVisitContactType(visitContactType === "gatekeeper" ? "" : "gatekeeper")}
              />
            </View>
            <View style={styles.editActions}>
              <Pressable
                onPress={() => {
                  setLoggingVisit(false);
                  setVisitNotes("");
                  setVisitContactType("");
                }}
                hitSlop={8}
                disabled={visitMutation.isPending}
              >
                <Text style={styles.cancelLink}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => visitMutation.mutate({ businessName: lead.businessName, notes: visitNotes, contactType: visitContactType })}
                hitSlop={8}
                disabled={visitMutation.isPending}
              >
                <Text style={styles.saveLink}>{visitMutation.isPending ? "Salvando…" : "💾 Salvar visita"}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Atividades recentes</Text>
        {activities.length === 0 && <Text style={styles.empty}>Nenhuma atividade registrada.</Text>}
        {activities.map((a) => (
          <View key={a.id} style={styles.activityRow}>
            <Text style={styles.activitySubject}>{a.subject}</Text>
            <Text style={styles.activityMeta}>
              {a.type} · {new Date(a.createdAt).toLocaleDateString("pt-BR")}
              {a.completedAt ? " · concluída" : ""}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

type InfoKind = "text" | "phone" | "whatsapp" | "url";

/** label/value row with a copy action, plus a kind-specific quick action (call, open WhatsApp,
 *  open site) — mirrors the tel:/wa.me actions already on each contact row below. */
function InfoRow({ label, value, kind = "text" }: { label: string; value: string | null | undefined; kind?: InfoKind }) {
  const [copied, setCopied] = useState(false);
  const hasValue = !!(value && value.trim());
  const trimmed = hasValue ? value!.trim() : "";

  async function copy() {
    if (!hasValue) return;
    await Clipboard.setStringAsync(trimmed);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function openPrimary() {
    if (!hasValue) return;
    if (kind === "phone") Linking.openURL(telHref(trimmed));
    else if (kind === "whatsapp") Linking.openURL(`https://wa.me/${digits(trimmed)}`);
    // Only bare domains get "https://" prepended — an already-explicit scheme (ftp:, mailto:, ...)
    // is left as-is instead of getting "https://" wrongly stacked in front of it.
    else if (kind === "url") Linking.openURL(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.infoValueRow}>
        <Text style={styles.value}>{hasValue ? trimmed : "—"}</Text>
        {hasValue && (
          <View style={styles.infoActions}>
            <Pressable onPress={copy} hitSlop={8}>
              <Text style={styles.actionIcon}>{copied ? "✅" : "📋"}</Text>
            </Pressable>
            {kind === "phone" && (
              <Pressable onPress={openPrimary} hitSlop={8}>
                <Text style={styles.actionIcon}>📞</Text>
              </Pressable>
            )}
            {kind === "whatsapp" && (
              <Pressable onPress={openPrimary} hitSlop={8}>
                <Text style={styles.actionIcon}>💬</Text>
              </Pressable>
            )}
            {kind === "url" && (
              <Pressable onPress={openPrimary} hitSlop={8}>
                <Text style={styles.actionIcon}>🌐</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

interface ContactEditState {
  name: string;
  role: string;
  phone: string;
  whatsapp: string;
}

function toContactEditState(contact: LeadContact): ContactEditState {
  return {
    name: contact.name ?? "",
    role: contact.role ?? "",
    phone: contact.phone ?? "",
    whatsapp: contact.whatsapp ?? "",
  };
}

function ContactRow({ leadId, contact, queryClient }: { leadId: string; contact: LeadContact; queryClient: QueryClient }) {
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<ContactEditState>(() => toContactEditState(contact));

  const mutation = useMutation({
    mutationFn: (patch: ContactEditPatch) => updateLeadContact(leadId, contact.id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactsKey(leadId) });
      setEditing(false);
    },
    onError: () => Alert.alert("Erro", "Não foi possível salvar o contato. Tente novamente."),
  });

  function startEdit() {
    setEdit(toContactEditState(contact));
    setEditing(true);
  }

  function save() {
    if (!edit.name.trim()) {
      Alert.alert("Nome", "O nome do contato não pode ficar em branco.");
      return;
    }
    const orig = toContactEditState(contact);
    const patch: ContactEditPatch = {};
    (Object.keys(edit) as (keyof ContactEditState)[]).forEach((key) => {
      if (edit[key].trim() !== orig[key].trim()) patch[key] = edit[key].trim();
    });
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      return;
    }
    mutation.mutate(patch);
  }

  if (editing) {
    return (
      <View style={styles.contactEditBlock}>
        <Field label="Nome" value={edit.name} onChangeText={(v) => setEdit((p) => ({ ...p, name: v }))} />
        <Field label="Cargo" value={edit.role} onChangeText={(v) => setEdit((p) => ({ ...p, role: v }))} />
        <Field label="Telefone" value={edit.phone} onChangeText={(v) => setEdit((p) => ({ ...p, phone: v }))} keyboardType="phone-pad" />
        <Field label="WhatsApp" value={edit.whatsapp} onChangeText={(v) => setEdit((p) => ({ ...p, whatsapp: v }))} keyboardType="phone-pad" />
        <View style={styles.editActions}>
          <Pressable onPress={() => setEditing(false)} hitSlop={8} disabled={mutation.isPending}>
            <Text style={styles.cancelLink}>Cancelar</Text>
          </Pressable>
          <Pressable onPress={save} hitSlop={8} disabled={mutation.isPending}>
            <Text style={styles.saveLink}>{mutation.isPending ? "Salvando…" : "💾 Salvar"}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.contactRow}>
      <View style={styles.grow}>
        <Text style={styles.contactName}>
          {contact.name}
          {contact.isPrimary ? " ⭐" : ""}
        </Text>
        {!!contact.role && <Text style={styles.contactRole}>{contact.role}</Text>}
      </View>
      <View style={styles.contactActions}>
        {!!contact.phone && (
          <Pressable onPress={() => Linking.openURL(telHref(contact.phone!))} hitSlop={8}>
            <Text style={styles.actionIcon}>📞</Text>
          </Pressable>
        )}
        {!!contact.whatsapp && (
          <Pressable onPress={() => Linking.openURL(`https://wa.me/${digits(contact.whatsapp!)}`)} hitSlop={8}>
            <Text style={styles.actionIcon}>💬</Text>
          </Pressable>
        )}
        <Pressable onPress={startEdit} hitSlop={8}>
          <Text style={styles.actionIcon}>✏️</Text>
        </Pressable>
      </View>
    </View>
  );
}

function NewContactForm({ leadId, queryClient, onDone }: { leadId: string; queryClient: QueryClient; onDone: () => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const mutation = useMutation({
    mutationFn: () => addLeadContact(leadId, { name, role, phone, whatsapp }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactsKey(leadId) });
      onDone();
    },
    onError: () => Alert.alert("Erro", "Não foi possível criar o contato. Tente novamente."),
  });

  function save() {
    if (!name.trim()) {
      Alert.alert("Nome", "Informe o nome do contato.");
      return;
    }
    mutation.mutate();
  }

  return (
    <View style={styles.contactEditBlock}>
      <Field label="Nome" value={name} onChangeText={setName} placeholder="Nome do contato" />
      <Field label="Cargo" value={role} onChangeText={setRole} />
      <Field label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
      <View style={styles.editActions}>
        <Pressable onPress={onDone} hitSlop={8} disabled={mutation.isPending}>
          <Text style={styles.cancelLink}>Cancelar</Text>
        </Pressable>
        <Pressable onPress={save} hitSlop={8} disabled={mutation.isPending}>
          <Text style={styles.saveLink}>{mutation.isPending ? "Salvando…" : "💾 Salvar contato"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Field({ label, multiline, ...props }: { label: string; multiline?: boolean } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#8a6d9c"
        style={[styles.input, multiline && styles.multiline]}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1a0022" },
  errorText: { color: "#f2a5a5" },
  name: { color: "#fff", fontSize: 22, fontWeight: "700" },
  badgeRow: { flexDirection: "row", gap: 8 },
  badge: { backgroundColor: "#2a1533", borderColor: "#4d2b5d", borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { color: "#c9b3d6", fontSize: 12, fontWeight: "600" },
  card: { backgroundColor: "#2a1533", borderColor: "#4d2b5d", borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  section: { color: "#e9dcf0", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  editLink: { color: "#c9b3d6", fontWeight: "600", fontSize: 13 },
  editActions: { flexDirection: "row", gap: 16 },
  cancelLink: { color: "#8a6d9c", fontWeight: "600", fontSize: 13 },
  saveLink: { color: "#7ee0a0", fontWeight: "700", fontSize: 13 },
  readRows: { gap: 10 },
  field: { gap: 4 },
  label: { color: "#b79ec6", fontSize: 13 },
  value: { color: "#fff", fontSize: 15, flex: 1 },
  infoValueRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  infoActions: { flexDirection: "row", gap: 12 },
  input: { backgroundColor: "#1a0022", borderColor: "#4d2b5d", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#fff", fontSize: 15 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10 },
  grow: { flex: 1 },
  uf: { width: 80 },
  empty: { color: "#8a6d9c", fontSize: 13 },
  contactRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#4d2b5d" },
  contactName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  contactRole: { color: "#b79ec6", fontSize: 12, marginTop: 2 },
  contactActions: { flexDirection: "row", gap: 14 },
  actionIcon: { fontSize: 20 },
  contactEditBlock: { gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#4d2b5d" },
  chipsRow: { flexDirection: "row", gap: 8 },
  chip: { borderColor: "#4d2b5d", borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: "#762991", borderColor: "#762991" },
  chipText: { color: "#c9b3d6", fontWeight: "600", fontSize: 13 },
  chipTextOn: { color: "#fff" },
  activityRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#4d2b5d" },
  activitySubject: { color: "#fff", fontSize: 14 },
  activityMeta: { color: "#8a6d9c", fontSize: 12, marginTop: 2, textTransform: "capitalize" },
});
