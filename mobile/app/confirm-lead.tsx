import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { checkGoogleId } from "@/lib/places";
import { placeToLeadBody, createLeadWithVisit } from "@/lib/leads";
import { getSelectedPlace, clearSelectedPlace } from "@/lib/selected-place";

const ALREADY_EXISTS = "ALREADY_EXISTS";

export default function ConfirmLeadScreen() {
  const router = useRouter();
  // Read the picked place once, into state, so clearing the store on success doesn't
  // flash the empty-state branch during the re-render before we navigate back.
  const [selected] = useState(getSelectedPlace);
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("no-place");
      const { place, searchTerm } = selected;
      const { exists } = await checkGoogleId(place.placeId);
      if (exists) throw new Error(ALREADY_EXISTS);
      // createLeadWithVisit keeps the visit non-fatal: a created lead is never undone by a
      // failed activity — it reports partial success instead (see leads.ts).
      return createLeadWithVisit(placeToLeadBody(place, searchTerm), notes);
    },
    onSuccess: ({ lead, visitLogged }) => {
      const name = lead.businessName ?? selected?.place.businessName;
      clearSelectedPlace();
      if (visitLogged) {
        Alert.alert("Pronto! ✅", `Lead "${name}" cadastrado e visita registrada.`);
      } else {
        Alert.alert("Lead cadastrado ⚠️", `"${name}" foi criado, mas a visita não foi registrada. Registre a atividade pelo CRM.`);
      }
      router.back();
    },
    onError: (e) => {
      if (e instanceof Error && e.message === ALREADY_EXISTS) {
        Alert.alert("Já cadastrado", "Este lugar já é um lead no CRM. Nenhum duplicado foi criado.");
      } else {
        Alert.alert("Erro", "Não foi possível cadastrar. Verifique a conexão e tente de novo.");
      }
    },
  });

  if (!selected) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Nenhum lugar selecionado.</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Voltar à busca</Text>
        </Pressable>
      </View>
    );
  }

  const { place } = selected;
  const phone = place.internationalPhone ?? place.phone;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.name}>{place.businessName}</Text>
        {!!place.address && <Text style={styles.row}>📍 {place.address}</Text>}
        {!!phone && <Text style={styles.row}>📞 {phone}</Text>}
        {!!place.website && <Text style={styles.row} numberOfLines={1}>🌐 {place.website}</Text>}
        {typeof place.rating === "number" && (
          <Text style={styles.row}>⭐ {place.rating.toFixed(1)}{place.userRatingCount ? ` · ${place.userRatingCount} avaliações` : ""}</Text>
        )}
        {!!place.primaryType && <Text style={styles.row}>🏷️ {place.primaryType}</Text>}
      </View>

      <Text style={styles.label}>Observações da visita (opcional)</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Ex.: falei com a gerente, pediu para voltar depois das 11h"
        placeholderTextColor="#8a6d9c"
        multiline
        style={styles.notes}
      />

      <Pressable
        style={({ pressed }) => [styles.saveBtn, (pressed || mutation.isPending) && styles.pressed]}
        disabled={mutation.isPending}
        onPress={() => mutation.mutate()}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Cadastrar lead + registrar visita</Text>
        )}
      </Pressable>
      <Text style={styles.hint}>Cria o lead com os dados do Google e registra uma atividade &quot;porta a porta&quot; concluída.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  muted: { color: "#b79ec6" },
  card: { backgroundColor: "#2a1533", borderColor: "#4d2b5d", borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 },
  name: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 4 },
  row: { color: "#c9b3d6", fontSize: 14 },
  label: { color: "#b79ec6", fontSize: 13, marginTop: 4 },
  notes: {
    backgroundColor: "#2a1533",
    borderColor: "#4d2b5d",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: "top",
  },
  saveBtn: { backgroundColor: "#762991", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.7 },
  hint: { color: "#8a6d9c", fontSize: 12, textAlign: "center" },
  backBtn: { borderColor: "#4d2b5d", borderWidth: 1, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  backBtnText: { color: "#c9b3d6", fontWeight: "600" },
});
