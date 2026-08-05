import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform, InteractionManager } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  createLeadWithVisit,
  addVisitToExistingLead,
  manualLeadBody,
  googleLeadBody,
  uploadActivityPhoto,
  checkLeadDuplicates,
  type ContactType,
  type CreatedLead,
  type DuplicateMatch,
} from "@/lib/leads";
import { getCurrentAddress, LocationPermissionError } from "@/lib/location";
import { checkGoogleId, type Place } from "@/lib/places";
import { getSelectedPlace, clearSelectedPlace } from "@/lib/selected-place";
import { scanCard, OcrUnavailableError } from "@/lib/ocr";
import { isOnline } from "@/lib/net";
import { enqueue } from "@/lib/outbox";
import { ApiError } from "@/lib/api";
import * as ImagePicker from "expo-image-picker";

const ALREADY_EXISTS = "ALREADY_EXISTS";

/** Same wording as the web CRM's DuplicateWarningPanel — matchedFields values from the backend. */
const DUPLICATE_MATCH_LABELS: Record<string, string> = {
  cnpj: "Mesmo CNPJ",
  name: "Nome similar",
  phone: "Mesmo telefone / WhatsApp",
  email: "Mesmo e-mail",
  address: "Mesmo logradouro e cidade",
};

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

/** Pre-fills the Empresa section from a Google place (the person/visit/follow-up stay empty). */
function seedFromPlace(place: Place): FormState {
  return {
    ...initial(),
    businessName: place.businessName ?? "",
    address: place.address ?? "",
    neighborhood: place.neighborhood ?? "",
    city: place.city ?? "",
    state: place.state ?? "",
    zipCode: place.zipCode ?? "",
    country: place.country ?? "",
    phone: place.internationalPhone ?? place.phone ?? "",
    website: place.website ?? "",
    description: place.description ?? "",
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

/**
 * Unified field-capture hub. `autoLocate` runs the GPS address fill on mount (GPS mode);
 * `fromGoogle` seeds the Empresa section from the selected Google place (Google mode);
 * `autoOpenCamera` opens the photo source picker on mount (Card/flyer mode).
 */
export function ManualLeadForm({
  autoLocate = false,
  fromGoogle = false,
  autoOpenCamera = false,
}: {
  autoLocate?: boolean;
  fromGoogle?: boolean;
  autoOpenCamera?: boolean;
}) {
  const router = useRouter();
  // Read the selected place once (Google mode). Manual/GPS never touch the store.
  const [sel] = useState(() => (fromGoogle ? getSelectedPlace() : null));
  const [f, setF] = useState<FormState>(() => (sel ? seedFromPlace(sel.place) : initial()));
  const [locating, setLocating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [facadePhotoUri, setFacadePhotoUri] = useState<string | null>(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | null>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  // The place is already captured into `sel`; drop it from the store so backing out without
  // saving never leaves a stale place pinned (and no later capture can pick it up).
  useEffect(() => { if (fromGoogle) clearSelectedPlace(); }, [fromGoogle]);

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

  function onPhoto() {
    Alert.alert("Foto do cartão / panfleto", "De onde?", [
      { text: "Tirar foto", onPress: () => capture("camera") },
      { text: "Escolher da galeria", onPress: () => capture("library") },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  async function capture(source: "camera" | "library") {
    try {
      let res: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return Alert.alert("Câmera", "Permissão de câmera negada.");
        res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return Alert.alert("Galeria", "Permissão de galeria negada.");
        res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ["images"] });
      }
      if (res.canceled || !res.assets?.[0]) return;
      if (!mounted.current) return;

      setScanning(true);
      const p = await scanCard(res.assets[0].uri);
      if (!mounted.current) return;
      // Fill only empty fields — never overwrite what GPS/Google/the user already set.
      setF((cur) => ({
        ...cur,
        businessName: cur.businessName || p.businessName || "",
        website: cur.website || p.website || "",
        phone: cur.phone || p.phone || "",
        contactName: cur.contactName || p.contactName || "",
        contactRole: cur.contactRole || p.contactRole || "",
        contactMobile: cur.contactMobile || p.contactMobile || "",
        contactEmail: cur.contactEmail || p.contactEmail || "",
      }));
    } catch (e) {
      if (e instanceof OcrUnavailableError) {
        Alert.alert("Leitura indisponível", "A leitura do cartão só funciona no app instalado (build), não no Expo Go. Preencha os campos manualmente.");
      } else {
        Alert.alert("Erro", "Não foi possível ler o cartão. Tente outra foto ou preencha manualmente.");
      }
    } finally {
      if (mounted.current) setScanning(false);
    }
  }

  function onFacadePhoto() {
    Alert.alert("Foto da fachada", "De onde?", [
      { text: "Tirar foto", onPress: () => captureFacadePhoto("camera") },
      { text: "Escolher da galeria", onPress: () => captureFacadePhoto("library") },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  // Same permission/picker pattern as capture() above, but no OCR — just keeps the uri to
  // attach to the visit activity on submit (see mutationFn).
  async function captureFacadePhoto(source: "camera" | "library") {
    try {
      let res: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return Alert.alert("Câmera", "Permissão de câmera negada.");
        res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return Alert.alert("Galeria", "Permissão de galeria negada.");
        res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ["images"] });
      }
      if (res.canceled || !res.assets?.[0]) return;
      if (!mounted.current) return;
      setFacadePhotoUri(res.assets[0].uri);
    } catch {
      Alert.alert("Erro", "Não foi possível capturar a foto. Tente de novo.");
    }
  }

  useEffect(() => {
    if (autoLocate) fillLocation();
    // Defer past the screen's push transition — firing Alert.alert synchronously on mount
    // races expo-router's native-stack animation and can fail to present on slower devices.
    if (autoOpenCamera) InteractionManager.runAfterInteractions(() => { if (mounted.current) onPhoto(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  type SubmitResult =
    | {
        status: "created";
        existing: boolean;
        lead: CreatedLead;
        visitLogged: boolean;
        followUpLogged: boolean;
        contactLogged: boolean;
        photoUploaded: boolean;
      }
    | { status: "queued" };

  const mutation = useMutation({
    mutationFn: async (): Promise<SubmitResult> => {
      const contact = f.contactName.trim()
        ? { name: f.contactName, role: f.contactRole, email: f.contactEmail, phone: f.contactMobile, whatsapp: f.contactMobile }
        : undefined;
      const opts = {
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
      };
      const body = sel ? googleLeadBody(f, contact, sel.place, sel.searchTerm) : manualLeadBody(f, contact);
      const online = await isOnline();

      // Google mode: check for a dedup hit (googleId is unique) before creating. Dedup can't be
      // verified without connectivity, so this only runs online — offline (or a network flake
      // here despite isOnline() saying yes) falls through to queueing below, and drainOutbox()
      // reconfirms before replaying (a rare resulting duplicate is still caught by the DB's
      // unique constraint at that point).
      let existingLeadId: string | undefined;
      let existingBusinessName: string | undefined;
      if (sel && online) {
        try {
          const check = await checkGoogleId(sel.place.placeId);
          if (check.exists) {
            if (check.leadId) {
              // Already a lead — don't refuse the capture, add the visit/contact to it instead
              // (revisiting a known business is the common case in door-to-door work).
              existingLeadId = check.leadId;
              existingBusinessName = check.businessName;
            } else {
              // Older backend without leadId in the response — fall back to the hard stop.
              throw new Error(ALREADY_EXISTS);
            }
          }
        } catch (e) {
          if (e instanceof Error && e.message === ALREADY_EXISTS) throw e;
          if (e instanceof ApiError) throw e; // real rejection (e.g. auth) — surface it
          // else: network flake — proceed to the create attempt/queue fallback below
        }
      }

      if (online) {
        try {
          type LeadResult = { lead: CreatedLead; visitLogged: boolean; followUpLogged: boolean; contactLogged: boolean; visitActivityId?: string };
          let result: LeadResult;
          if (existingLeadId) {
            result = await addVisitToExistingLead(existingLeadId, existingBusinessName ?? f.businessName, contact, opts);
          } else {
            result = { ...(await createLeadWithVisit(body, opts)), contactLogged: true };
          }
          const { contactLogged } = result;
          let photoUploaded = !facadePhotoUri; // nothing to upload counts as "done"
          if (facadePhotoUri && result.visitActivityId) {
            try {
              await uploadActivityPhoto(result.visitActivityId, facadePhotoUri);
              photoUploaded = true;
            } catch {
              photoUploaded = false; // non-fatal — lead/visit are already saved
            }
          }
          return {
            status: "created",
            existing: !!existingLeadId,
            lead: result.lead,
            visitLogged: result.visitLogged,
            followUpLogged: result.followUpLogged,
            contactLogged,
            photoUploaded,
          };
        } catch (e) {
          if (e instanceof ApiError) throw e; // real rejection — user must fix, don't queue
          // else: raw network failure — fall through to queueing below
        }
      }

      // Offline, or the online attempt above failed on a raw network error: save locally
      // instead of losing the capture. drainOutbox() (wired in app/_layout.tsx) replays it
      // once connectivity returns.
      await enqueue(body, opts);
      return { status: "queued" };
    },
    onSuccess: (result) => {
      clearSelectedPlace();
      if (result.status === "queued") {
        // The offline outbox only holds the JSON lead+visit body — the photo file itself isn't
        // queued (see uploadActivityPhoto's comment), so it's lost here, not just delayed.
        const photoNote = facadePhotoUri ? " A foto da fachada não foi salva — tire de novo quando reconectar." : "";
        Alert.alert(
          "Sem conexão 📴",
          `O lead foi salvo no seu aparelho e será enviado automaticamente quando a conexão voltar.${photoNote}`,
        );
        setF(initial());
        setFacadePhotoUri(null);
        router.back();
        return;
      }
      const { lead, existing, visitLogged, followUpLogged, contactLogged, photoUploaded } = result;
      const name = lead.businessName ?? f.businessName;
      const warn: string[] = [];
      if (!visitLogged) warn.push("a visita");
      if (existing && !contactLogged) warn.push("o contato");
      if (f.followUpEnabled && !followUpLogged) warn.push("o retorno");
      if (!photoUploaded) warn.push("a foto da fachada");
      if (warn.length) {
        Alert.alert(
          existing ? "Lead já existia ⚠️" : "Lead cadastrado ⚠️",
          `"${name}" ${existing ? "já estava no CRM, mas" : "foi criado, mas"} ${warn.join(" e ")} não foi registrado${warn.length > 1 ? "s" : ""}. Tente de novo pelo CRM.`,
        );
      } else if (existing) {
        Alert.alert(
          "Lead já existia ℹ️",
          `"${name}" já estava no CRM — visita${f.contactName.trim() ? " e contato" : ""} registrada${f.followUpEnabled ? " e retorno agendado" : ""}.`,
        );
      } else {
        Alert.alert("Pronto! ✅", `Lead "${name}" cadastrado${f.followUpEnabled ? ", visita e retorno registrados" : " e visita registrada"}.`);
      }
      setF(initial());
      setFacadePhotoUri(null);
      router.back();
    },
    onError: (e) => {
      if (e instanceof Error && e.message === ALREADY_EXISTS) {
        clearSelectedPlace();
        Alert.alert("Já cadastrado", "Este lugar já é um lead no CRM. Nenhum duplicado foi criado.");
        router.back();
      } else {
        Alert.alert("Erro", "Não foi possível cadastrar. Verifique a conexão e tente de novo.");
      }
    },
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

  async function onSubmit() {
    if (locating) return;
    if (fromGoogle && !sel) {
      Alert.alert("Selecione um lugar", "Volte e escolha o negócio no Google de novo.");
      return;
    }
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

    // Google mode already has its own dedup path (checkGoogleId, inside mutationFn) — this
    // fuzzy name/phone check fills the gap for manual/GPS/card, which had none. Warn, don't
    // block (same UX as the web CRM's create-lead form) — fails open on error/offline so a
    // flaky connection never prevents a capture in the field.
    if (!fromGoogle) {
      const online = await isOnline();
      if (online) {
        setCheckingDuplicates(true);
        try {
          const phone = f.phone.trim() || f.contactMobile.trim() || undefined;
          const result = await checkLeadDuplicates({ name: f.businessName.trim(), phone });
          if (!mounted.current) return;
          if (result.hasDuplicates) {
            setDuplicates(result.duplicates);
            return;
          }
        } catch {
          // network flake or backend error — proceed to create rather than block the capture
        } finally {
          if (mounted.current) setCheckingDuplicates(false);
        }
      }
    }

    mutation.mutate();
  }

  const busy = mutation.isPending || locating || scanning || checkingDuplicates;

  if (duplicates) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.dupTitle}>⚠ Possíveis leads duplicados encontrados</Text>
        <Text style={styles.dupSub}>
          Revise os leads abaixo antes de salvar. Você pode abrir cada um para conferir ou cadastrar mesmo assim.
        </Text>
        {duplicates.map((d) => (
          <View key={d.leadId} style={styles.dupCard}>
            <Text style={styles.dupName}>
              {d.businessName}
              {d.isArchived ? " (arquivado)" : ""}
            </Text>
            {!!(d.city || d.state) && <Text style={styles.dupMeta}>{[d.city, d.state].filter(Boolean).join(" / ")}</Text>}
            {!!d.phone && <Text style={styles.dupMeta}>📞 {d.phone}</Text>}
            <View style={styles.chipsRow}>
              {d.matchedFields.map((mf) => (
                <View key={mf} style={styles.dupBadge}>
                  <Text style={styles.dupBadgeText}>{DUPLICATE_MATCH_LABELS[mf] ?? mf}</Text>
                </View>
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [styles.ghost, styles.dupViewBtn, pressed && styles.pressed]}
              onPress={() => {
                setDuplicates(null);
                router.push(`/lead/${d.leadId}`);
              }}
            >
              <Text style={styles.ghostText}>Ver lead</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.dupActions}>
          <Pressable
            style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
            onPress={() => setDuplicates(null)}
            disabled={mutation.isPending}
          >
            <Text style={styles.ghostText}>Voltar e revisar</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, styles.dupConfirmBtn, (pressed || mutation.isPending) && styles.pressed]}
            onPress={() => {
              setDuplicates(null);
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Cadastrar mesmo assim</Text>}
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* ── EMPRESA ── */}
      <Text style={styles.section}>Empresa</Text>
      <Field label="Nome do negócio *" value={f.businessName} onChangeText={(v) => set("businessName", v)} placeholder="Ex.: Padaria do João" />
      <View style={styles.chipsRow}>
        <Pressable style={({ pressed }) => [styles.ghost, pressed && styles.pressed]} onPress={fillLocation} disabled={busy}>
          {locating ? <ActivityIndicator size="small" color="#c9b3d6" /> : <Text style={styles.ghostText}>📍 Usar localização</Text>}
        </Pressable>
        <Pressable style={({ pressed }) => [styles.ghost, pressed && styles.pressed]} onPress={onPhoto} disabled={busy}>
          {scanning ? <ActivityIndicator size="small" color="#c9b3d6" /> : <Text style={styles.ghostText}>📷 Foto do cartão</Text>}
        </Pressable>
        <Pressable style={({ pressed }) => [styles.ghost, pressed && styles.pressed]} onPress={onFacadePhoto} disabled={busy}>
          <Text style={styles.ghostText}>{facadePhotoUri ? "✅ Fachada anexada" : "🏬 Foto da fachada"}</Text>
        </Pressable>
      </View>
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
        {mutation.isPending || checkingDuplicates ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salvar tudo</Text>}
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
  dupTitle: { color: "#f4c860", fontSize: 17, fontWeight: "700" },
  dupSub: { color: "#e9dcf0", fontSize: 13, marginTop: 4 },
  dupCard: {
    backgroundColor: "#2a1533",
    borderColor: "#8a6d1f",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    gap: 4,
  },
  dupName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  dupMeta: { color: "#b79ec6", fontSize: 13 },
  dupBadge: { backgroundColor: "#3a2e12", borderColor: "#8a6d1f", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dupBadgeText: { color: "#f4c860", fontSize: 11, fontWeight: "600" },
  dupViewBtn: { marginTop: 8, alignSelf: "flex-start" },
  dupActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  dupConfirmBtn: { flex: 1, marginTop: 0 },
});
