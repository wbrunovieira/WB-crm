import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";
import { createLeadWithVisit, manualLeadBody, type ContactType } from "@/lib/leads";
import { getCurrentAddress, LocationPermissionError } from "@/lib/location";

interface FormState {
  // Empresa
  businessName: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  website: string;
  description: string;
  latitude?: number;
  longitude?: number;
  // Pessoa
  contactName: string;
  contactRole: string;
  contactMobile: string;
  contactEmail: string;
  contactType: ContactType | "";
  // Visita
  notes: string;
  // Próximo passo
  followUpEnabled: boolean;
  followUpType: string; // task | call
  followUpSubject: string;
  followUpAt: Date;
  remindEnabled: boolean;
}

function initial(): FormState {
  return {
    businessName: "", address: "", neighborhood: "", city: "", state: "", zipCode: "", country: "",
    phone: "", website: "", description: "",
    contactName: "", contactRole: "", contactMobile: "", contactEmail: "", contactType: "",
    notes: "",
    followUpEnabled: false, followUpType: "task", followUpSubject: "", followUpAt: new Date(), remindEnabled: true,
  };
}

/** Unified field-capture hub. `autoLocate` runs the GPS address fill on mount (GPS mode). */
export function ManualLeadForm({ autoLocate = false }: { autoLocate?: boolean }) {
  const router = useRouter();
  const [f, setF] = useState<FormState>(initial);
  const [locating, setLocating] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setF((p) => ({ ...p, [key]: value }));

  async function fillLocation() {
    setLocating(true);
    try {
      const a = await getCurrentAddress();
      if (!mounted.current) return;
      setF((p) => ({
        ...p,
        address: a.address || p.address,
        neighborhood: a.neighborhood || p.neighborhood,
        city: a.city || p.city,
        state: a.state || p.state,
        zipCode: a.zipCode || p.zipCode,
        country: a.country || p.country,
        latitude: a.latitude,
        longitude: a.longitude,
      }));
    } catch (e) {
      if (mounted.current) {
        Alert.alert("Localização", e instanceof LocationPermissionError
          ? "Permissão de localização negada. Ative nos Ajustes."
          : "Não foi possível obter sua localização.");
      }
    } finally {
      if (mounted.current) setLocating(false);
    }
  }

  useEffect(() => {
    if (autoLocate) fillLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mutation = useMutation({
    mutationFn: () =>
      createLeadWithVisit(
        manualLeadBody(
          f,
          f.contactName.trim() ? { name: f.contactName, role: f.contactRole, email: f.contactEmail, phone: f.contactMobile, whatsapp: f.contactMobile } : undefined,
        ),
        {
          notes: f.notes,
          contactType: f.contactType || undefined,
          followUp: f.followUpEnabled
            ? {
                type: f.followUpType,
                subject: f.followUpSubject.trim() || `Retornar — ${f.businessName.trim()}`,
                dueAtISO: f.followUpAt.toISOString(),
                remindAtISO: f.remindEnabled ? f.followUpAt.toISOString() : undefined,
              }
            : undefined,
        },
      ),
    onSuccess: ({ lead, visitLogged, followUpLogged }) => {
      const name = lead.businessName ?? f.businessName;
      const warn: string[] = [];
      if (!visitLogged) warn.push("a visita");
      if (f.followUpEnabled && !followUpLogged) warn.push("o retorno");
      if (warn.length) {
        Alert.alert("Lead cadastrado ⚠️", `"${name}" foi criado, mas ${warn.join(" e ")} não foi registrado. Registre pelo CRM.`);
      } else {
        Alert.alert("Pronto! ✅", `Lead "${name}" cadastrado${f.followUpEnabled ? ", visita e retorno registrados" : " e visita registrada"}.`);
      }
      setF(initial());
      router.back();
    },
    onError: () => Alert.alert("Erro", "Não foi possível cadastrar. Verifique a conexão e tente de novo."),
  });

  // Enabling the follow-up: bump a stale/now default to a sensible future time so we never
  // schedule a return in the past. Disabling just flips the flag.
  function toggleFollowUp() {
    setF((p) => {
      const enabling = !p.followUpEnabled;
      const future = enabling && p.followUpAt.getTime() <= Date.now() ? new Date(Date.now() + 24 * 60 * 60 * 1000) : p.followUpAt;
      return { ...p, followUpEnabled: enabling, followUpAt: future };
    });
  }

  function onSubmit() {
    if (locating) return;
    if (!f.businessName.trim()) {
      Alert.alert("Falta o nome", "Informe o nome do negócio.");
      return;
    }
    // Person data typed without a name would be silently dropped (contact needs a name).
    if (!f.contactName.trim() && (f.contactMobile.trim() || f.contactEmail.trim() || f.contactRole.trim())) {
      Alert.alert("Contato sem nome", "Você preencheu dados da pessoa mas sem o nome — informe o nome para salvar o contato.");
      return;
    }
    if (f.followUpEnabled && f.followUpAt.getTime() <= Date.now()) {
      Alert.alert("Retorno", "Escolha uma data/hora futura para o retorno.");
      return;
    }
    mutation.mutate();
  }

  const busy = mutation.isPending || locating;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* ── EMPRESA ── */}
      <Text style={styles.section}>Empresa</Text>
      <Field label="Nome do negócio *" value={f.businessName} onChangeText={(v) => set("businessName", v)} placeholder="Ex.: Padaria do João" />
      <Pressable style={({ pressed }) => [styles.ghost, pressed && styles.pressed]} onPress={fillLocation} disabled={locating}>
        {locating ? <ActivityIndicator size="small" color="#c9b3d6" /> : <Text style={styles.ghostText}>📍 Usar minha localização</Text>}
      </Pressable>
      <Field label="Endereço" value={f.address} onChangeText={(v) => set("address", v)} placeholder="Rua, número" />
      <Field label="Bairro" value={f.neighborhood} onChangeText={(v) => set("neighborhood", v)} />
      <View style={styles.row}>
        <View style={styles.grow}><Field label="Cidade" value={f.city} onChangeText={(v) => set("city", v)} /></View>
        <View style={styles.uf}><Field label="UF" value={f.state} onChangeText={(v) => set("state", v)} autoCapitalize="characters" maxLength={2} /></View>
      </View>
      <Field label="CEP" value={f.zipCode} onChangeText={(v) => set("zipCode", v)} keyboardType="numbers-and-punctuation" />
      <Field label="Telefone (fixo)" value={f.phone} onChangeText={(v) => set("phone", v)} keyboardType="phone-pad" />
      <Field label="Site" value={f.website} onChangeText={(v) => set("website", v)} autoCapitalize="none" keyboardType="url" />

      {/* ── PESSOA ── */}
      <Text style={styles.section}>Pessoa (com quem falei)</Text>
      <Field label="Nome" value={f.contactName} onChangeText={(v) => set("contactName", v)} placeholder="Nome do contato" />
      <Field label="Cargo" value={f.contactRole} onChangeText={(v) => set("contactRole", v)} />
      <Field label="Celular / WhatsApp" value={f.contactMobile} onChangeText={(v) => set("contactMobile", v)} keyboardType="phone-pad" placeholder="Ex.: (24) 99999-8888" />
      <Field label="E-mail" value={f.contactEmail} onChangeText={(v) => set("contactEmail", v)} autoCapitalize="none" keyboardType="email-address" />
      <View style={styles.chipsRow}>
        <Chip label="Decisor" active={f.contactType === "decisor"} onPress={() => set("contactType", f.contactType === "decisor" ? "" : "decisor")} />
        <Chip label="Atendente" active={f.contactType === "gatekeeper"} onPress={() => set("contactType", f.contactType === "gatekeeper" ? "" : "gatekeeper")} />
      </View>

      {/* ── VISITA ── */}
      <Text style={styles.section}>Visita</Text>
      <Field label="Observações" value={f.notes} onChangeText={(v) => set("notes", v)} placeholder="O que conversamos" multiline />

      {/* ── PRÓXIMO PASSO ── */}
      <Text style={styles.section}>Próximo passo</Text>
      <Pressable style={styles.toggleRow} onPress={toggleFollowUp}>
        <View style={[styles.checkbox, f.followUpEnabled && styles.checkboxOn]}>{f.followUpEnabled && <Text style={styles.check}>✓</Text>}</View>
        <Text style={styles.toggleText}>Agendar retorno</Text>
      </Pressable>
      {f.followUpEnabled && (
        <View style={styles.followUp}>
          <View style={styles.chipsRow}>
            <Chip label="Tarefa" active={f.followUpType === "task"} onPress={() => set("followUpType", "task")} />
            <Chip label="Ligação" active={f.followUpType === "call"} onPress={() => set("followUpType", "call")} />
          </View>
          <Field label="Assunto" value={f.followUpSubject} onChangeText={(v) => set("followUpSubject", v)} placeholder={`Retornar — ${f.businessName.trim() || "negócio"}`} />
          <Text style={styles.label}>Quando</Text>
          {/* mode="datetime" is iOS-only (target is iPhone/iPad). On Android it would need a
              separate date-then-time flow — revisit if Android is ever supported. */}
          <DateTimePicker
            value={f.followUpAt}
            mode="datetime"
            display={Platform.OS === "ios" ? "compact" : "default"}
            minimumDate={new Date()}
            onChange={(_e, d) => d && set("followUpAt", d)}
            themeVariant="dark"
          />
          <Pressable style={styles.toggleRow} onPress={() => set("remindEnabled", !f.remindEnabled)}>
            <View style={[styles.checkbox, f.remindEnabled && styles.checkboxOn]}>{f.remindEnabled && <Text style={styles.check}>✓</Text>}</View>
            <Text style={styles.toggleText}>🔔 Notificar-me nesse horário</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={({ pressed }) => [styles.saveBtn, (pressed || busy) && styles.pressed]} disabled={busy} onPress={onSubmit}>
        {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salvar tudo</Text>}
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, multiline, ...props }: { label: string; multiline?: boolean } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#8a6d9c" style={[styles.input, multiline && styles.multiline]} multiline={multiline} {...props} />
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

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  section: { color: "#e9dcf0", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 10 },
  field: { gap: 4 },
  label: { color: "#b79ec6", fontSize: 13 },
  input: { backgroundColor: "#2a1533", borderColor: "#4d2b5d", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#fff", fontSize: 15 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10 },
  grow: { flex: 1 },
  uf: { width: 80 },
  ghost: { alignSelf: "flex-start", borderColor: "#4d2b5d", borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  ghostText: { color: "#c9b3d6", fontWeight: "600", fontSize: 13 },
  pressed: { opacity: 0.7 },
  chipsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  chip: { borderColor: "#4d2b5d", borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: "#762991", borderColor: "#762991" },
  chipText: { color: "#c9b3d6", fontWeight: "600", fontSize: 13 },
  chipTextOn: { color: "#fff" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: "#4d2b5d", alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: "#762991", borderColor: "#762991" },
  check: { color: "#fff", fontWeight: "700", fontSize: 13 },
  toggleText: { color: "#e9dcf0", fontSize: 14 },
  followUp: { gap: 8, marginTop: 4, paddingLeft: 4 },
  saveBtn: { backgroundColor: "#762991", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 16 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
