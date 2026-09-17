import { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import { searchLeadsAndOrgs, type SearchHit } from "@/lib/search";

export default function BuscaScreen() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function onSearch() {
    const q = term.trim();
    if (!q) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      setResults(await searchLeadsAndOrgs(q));
    } catch {
      setResults([]);
      setError("Erro ao buscar. Verifique a conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          value={term}
          onChangeText={setTerm}
          onSubmitEditing={onSearch}
          returnKeyType="search"
          placeholder="Nome do lead ou cliente"
          placeholderTextColor="#8a6d9c"
          style={styles.input}
          autoFocus
        />
        <Pressable style={({ pressed }) => [styles.searchBtn, pressed && styles.pressed]} onPress={onSearch}>
          <Text style={styles.searchBtnText}>Buscar</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={results}
        keyExtractor={(h) => `${h.kind}:${h.id}`}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const ehCliente = item.kind === "org";
          return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                ehCliente ? styles.cardOrg : styles.cardLead,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push(ehCliente ? `/org/${item.id}` : `/lead/${item.id}`)}
            >
              <Text style={ehCliente ? styles.tagOrg : styles.tagLead}>
                {ehCliente ? "CLIENTE" : "LEAD"}
              </Text>
              <Text style={styles.name}>{item.name}</Text>
              {!!(item.city || item.state) && (
                <Text style={styles.addr}>{[item.city, item.state].filter(Boolean).join(" - ")}</Text>
              )}
              <View style={styles.metaRow}>
                {!!item.status && <Text style={styles.meta}>{item.status}</Text>}
                {!!item.quality && <Text style={styles.meta}>⭐ {item.quality}</Text>}
                {!!item.phone && <Text style={styles.meta}>📞 {item.phone}</Text>}
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={loading ? <ActivityIndicator color="#c9b3d6" style={styles.footer} /> : null}
        ListEmptyComponent={!loading && searched ? <Text style={styles.empty}>Nenhum lead ou cliente encontrado.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  searchRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: "#2a1533",
    borderColor: "#4d2b5d",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 15,
  },
  searchBtn: { backgroundColor: "#762991", borderRadius: 12, paddingHorizontal: 18, justifyContent: "center" },
  searchBtnText: { color: "#fff", fontWeight: "700" },
  pressed: { opacity: 0.7 },
  error: { color: "#f2a5a5", marginTop: 12 },
  list: { paddingVertical: 12, gap: 10 },
  card: { backgroundColor: "#2a1533", borderColor: "#4d2b5d", borderWidth: 1, borderRadius: 14, padding: 14 },
  // Side stripe + label, the same lead/customer cue the web CRM uses.
  cardLead: { borderLeftWidth: 4, borderLeftColor: "#762991" },
  cardOrg: { borderLeftWidth: 4, borderLeftColor: "#2f9e6e" },
  tagLead: { color: "#c9a2dd", fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 2 },
  tagOrg: { color: "#6fd8aa", fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 2 },
  name: { color: "#fff", fontSize: 16, fontWeight: "600" },
  addr: { color: "#b79ec6", fontSize: 13, marginTop: 2 },
  metaRow: { flexDirection: "row", gap: 14, marginTop: 8, flexWrap: "wrap" },
  meta: { color: "#c9b3d6", fontSize: 12 },
  footer: { paddingVertical: 16 },
  empty: { color: "#8a6d9c", textAlign: "center", marginTop: 24 },
});
