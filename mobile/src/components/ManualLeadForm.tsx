import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { createLeadWithVisit, manualLeadBody, type ManualLeadFields } from "@/lib/leads";
import { getCurrentAddress, LocationPermissionError } from "@/lib/location";

type Fields = ManualLeadFields & { notes: string };

const EMPTY: Fields = {
  businessName: "",
  address: "",
  neighborhood: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  phone: "",
  website: "",
  description: "",
  notes: "",
  latitude: undefined,
  longitude: undefined,
};

/** Manual lead capture form. `autoLocate` runs the GPS address fill on mount (GPS mode). */
export function ManualLeadForm({ autoLocate = false }: { autoLocate?: boolean }) {
  const router = useRouter();
  const [f, setF] = useState<Fields>(EMPTY);
  const [locating, setLocating] = useState(false);
  // Guards against state updates after the screen unmounts (GPS can resolve late).
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => setF((p) => ({ ...p, [key]: value }));

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
        Alert.alert(
          "Localização",
          e instanceof LocationPermissionError
            ? "Permissão de localização negada. Ative nos Ajustes."
            : "Não foi possível obter sua localização.",
        );
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
    mutationFn: () => createLeadWithVisit(manualLeadBody(f), f.notes),
    onSuccess: ({ lead, visitLogged }) => {
      const name = lead.businessName ?? f.businessName;
      if (visitLogged) Alert.alert("Pronto! ✅", `Lead "${name}" cadastrado e visita registrada.`);
      else Alert.alert("Lead cadastrado ⚠️", `"${name}" foi criado, mas a visita não foi registrada. Registre pelo CRM.`);
      setF(EMPTY);
      router.back();
    },
    onError: () => Alert.alert("Erro", "Não foi possível cadastrar. Verifique a conexão e tente de novo."),
  });

  function onSubmit() {
    if (locating) return; // wait for the GPS fill so lat/long + address aren't lost
    if (!f.businessName.trim()) {
      Alert.alert("Falta o nome", "Informe o nome do negócio.");
      return;
    }
    mutation.mutate();
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Field label="Nome do negócio *" value={f.businessName} onChangeText={(v) => set("businessName", v)} placeholder="Ex.: Padaria do João" />

      <Pressable style={({ pressed }) => [styles.locBtn, pressed && styles.pressed]} onPress={fillLocation} disabled={locating}>
        {locating ? <ActivityIndicator size="small" color="#c9b3d6" /> : <Text style={styles.locBtnText}>📍 Usar minha localização</Text>}
      </Pressable>

      <Field label="Endereço" value={f.address ?? ""} onChangeText={(v) => set("address", v)} placeholder="Rua, número" />
      <Field label="Bairro" value={f.neighborhood ?? ""} onChangeText={(v) => set("neighborhood", v)} />
      <View style={styles.row}>
        <View style={styles.grow}><Field label="Cidade" value={f.city ?? ""} onChangeText={(v) => set("city", v)} /></View>
        <View style={styles.uf}><Field label="UF" value={f.state ?? ""} onChangeText={(v) => set("state", v)} autoCapitalize="characters" maxLength={2} /></View>
      </View>
      <Field label="CEP" value={f.zipCode ?? ""} onChangeText={(v) => set("zipCode", v)} keyboardType="numbers-and-punctuation" />
      <Field label="Telefone" value={f.phone ?? ""} onChangeText={(v) => set("phone", v)} keyboardType="phone-pad" />
      <Field label="Site" value={f.website ?? ""} onChangeText={(v) => set("website", v)} autoCapitalize="none" keyboardType="url" />
      <Field label="Descrição" value={f.description ?? ""} onChangeText={(v) => set("description", v)} multiline />
      <Field label="Observações da visita" value={f.notes} onChangeText={(v) => set("notes", v)} placeholder="Ex.: falei com o dono, voltar depois das 11h" multiline />

      <Pressable style={({ pressed }) => [styles.saveBtn, (pressed || mutation.isPending || locating) && styles.pressed]} disabled={mutation.isPending || locating} onPress={onSubmit}>
        {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Cadastrar lead + registrar visita</Text>}
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  multiline,
  ...props
}: { label: string; multiline?: boolean } & React.ComponentProps<typeof TextInput>) {
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
  container: { padding: 16, gap: 10 },
  field: { gap: 4 },
  label: { color: "#b79ec6", fontSize: 13 },
  input: {
    backgroundColor: "#2a1533",
    borderColor: "#4d2b5d",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 15,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10 },
  grow: { flex: 1 },
  uf: { width: 80 },
  locBtn: { alignSelf: "flex-start", borderColor: "#4d2b5d", borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  locBtnText: { color: "#c9b3d6", fontWeight: "600", fontSize: 13 },
  pressed: { opacity: 0.7 },
  saveBtn: { backgroundColor: "#762991", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
