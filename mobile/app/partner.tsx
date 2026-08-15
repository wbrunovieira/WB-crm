import { useRef, useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { createPartnerWithContact, partnerBody, PARTNER_TYPES } from "@/lib/partners";
import { scanCard, OcrUnavailableError } from "@/lib/ocr";
import { ApiError } from "@/lib/api";
import * as ImagePicker from "expo-image-picker";

interface FormState {
  name: string;
  partnerType: string;
  website: string;
  phone: string;
  notes: string;
  contactName: string;
  contactRole: string;
  contactMobile: string;
  contactEmail: string;
}

function initial(): FormState {
  return {
    name: "", partnerType: "", website: "", phone: "", notes: "",
    contactName: "", contactRole: "", contactMobile: "", contactEmail: "",
  };
}

/** Capture a new partner met in person (e.g. a business card from an event) — company info +
 *  the contact person, with the same card-photo OCR fill used for leads. No offline queue yet
 *  (unlike leads' Fase 4 outbox) — a failed save just keeps the typed data on screen to retry. */
export default function PartnerScreen() {
  const router = useRouter();
  const [f, setF] = useState<FormState>(initial);
  const [scanning, setScanning] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setF((p) => ({ ...p, [key]: value }));

  function onPhoto() {
    Alert.alert("Foto do cartão", "De onde?", [
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
      // Fill only empty fields — never overwrite what the user already typed.
      setF((cur) => ({
        ...cur,
        name: cur.name || p.businessName || "",
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

  const mutation = useMutation({
    mutationFn: () => {
      const contact = f.contactName.trim()
        ? { name: f.contactName, role: f.contactRole, email: f.contactEmail, phone: f.contactMobile, whatsapp: f.contactMobile }
        : undefined;
      return createPartnerWithContact(partnerBody(f), contact);
    },
    onSuccess: ({ partner, contactLogged }) => {
      if (!contactLogged) {
        Alert.alert("Parceiro cadastrado ⚠️", `"${partner.name}" foi criado, mas o contato não foi registrado. Tente adicionar pelo CRM.`);
      } else {
        Alert.alert("Pronto! ✅", `Parceiro "${partner.name}" cadastrado.`);
      }
      setF(initial());
      router.back();
    },
    onError: (e) => {
      const msg = e instanceof ApiError && e.status >= 400 && e.status < 500
        ? "Não foi possível cadastrar. Confira os dados e tente de novo."
        : "Não foi possível cadastrar. Verifique a conexão e tente de novo.";
      Alert.alert("Erro", msg);
    },
  });

  function onSubmit() {
    if (scanning) return;
    if (!f.name.trim()) {
      Alert.alert("Falta o nome", "Informe o nome do parceiro.");
      return;
    }
    if (!f.partnerType) {
      Alert.alert("Tipo de parceria", "Escolha o tipo de parceria.");
      return;
    }
    if (!f.contactName.trim() && (f.contactMobile.trim() || f.contactEmail.trim() || f.contactRole.trim())) {
      Alert.alert("Contato sem nome", "Você preencheu dados da pessoa mas sem o nome — informe o nome para salvar o contato.");
      return;
    }
    mutation.mutate();
  }

  const busy = mutation.isPending || scanning;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.section}>Parceiro</Text>
      <Field label="Nome *" value={f.name} onChangeText={(v) => set("name", v)} placeholder="Ex.: Agência Prisma" />

      <Pressable style={({ pressed }) => [styles.ghost, pressed && styles.pressed]} onPress={onPhoto} disabled={busy}>
        {scanning ? <ActivityIndicator size="small" color="#c9b3d6" /> : <Text style={styles.ghostText}>📷 Foto do cartão</Text>}
      </Pressable>

      <Text style={styles.label}>Tipo de parceria *</Text>
      <View style={styles.typeChipsRow}>
        {PARTNER_TYPES.map((t) => (
          <Chip key={t.value} label={t.label} active={f.partnerType === t.value} onPress={() => set("partnerType", t.value)} />
        ))}
      </View>

      <Field label="Site" value={f.website} onChangeText={(v) => set("website", v)} autoCapitalize="none" keyboardType="url" />
      <Field label="Telefone" value={f.phone} onChangeText={(v) => set("phone", v)} keyboardType="phone-pad" />
      <Field label="Notas" value={f.notes} onChangeText={(v) => set("notes", v)} placeholder="Onde conheci, do que conversamos…" multiline />

      <Text style={styles.section}>Pessoa (com quem falei)</Text>
      <Field label="Nome" value={f.contactName} onChangeText={(v) => set("contactName", v)} placeholder="Nome do contato" />
      <Field label="Cargo" value={f.contactRole} onChangeText={(v) => set("contactRole", v)} />
      <Field label="Celular / WhatsApp" value={f.contactMobile} onChangeText={(v) => set("contactMobile", v)} keyboardType="phone-pad" placeholder="Ex.: (24) 99999-8888" />
      <Field label="E-mail" value={f.contactEmail} onChangeText={(v) => set("contactEmail", v)} autoCapitalize="none" keyboardType="email-address" />

      <Pressable style={({ pressed }) => [styles.saveBtn, (pressed || busy) && styles.pressed]} disabled={busy} onPress={onSubmit}>
        {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salvar parceiro</Text>}
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
  ghost: { alignSelf: "flex-start", borderColor: "#4d2b5d", borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  ghostText: { color: "#c9b3d6", fontWeight: "600", fontSize: 13 },
  pressed: { opacity: 0.7 },
  typeChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderColor: "#4d2b5d", borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: "#762991", borderColor: "#762991" },
  chipText: { color: "#c9b3d6", fontWeight: "600", fontSize: 13 },
  chipTextOn: { color: "#fff" },
  saveBtn: { backgroundColor: "#762991", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 16 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
