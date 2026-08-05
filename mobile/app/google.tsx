import { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator, Keyboard, Alert } from "react-native";
import { useRouter } from "expo-router";
import { searchPlaces, type Place } from "@/lib/places";
import { ApiError } from "@/lib/api";
import { getNearbyContext, LocationPermissionError, type NearbyContext } from "@/lib/location";
import { setSelectedPlace } from "@/lib/selected-place";
import { isOnline } from "@/lib/net";

export default function GoogleSearchScreen() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [lastQuery, setLastQuery] = useState(""); // effective query actually sent (for pagination)
  const [nearby, setNearby] = useState<NearbyContext | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function runSearch(query: string, pageToken?: string) {
    setLoading(true);
    setError(null);
    // Fail fast instead of waiting out a timeout — search always needs a live request (no
    // offline cache), so tell the user up front and point at the modes that work without one.
    if (!(await isOnline())) {
      setError("Sem conexão — a busca no Google exige internet. Use 📍 GPS ou o cadastro manual enquanto estiver offline.");
      setLoading(false);
      return;
    }
    try {
      const res = await searchPlaces(query, pageToken);
      setResults((prev) => {
        if (!pageToken) return res.places;
        // Dedupe: Google can repeat a place across pages, which would warn on duplicate keys.
        const seen = new Set(prev.map((p) => p.placeId));
        return [...prev, ...res.places.filter((p) => !seen.has(p.placeId))];
      });
      setNextPageToken(res.nextPageToken);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 429
          ? "Muitas buscas seguidas. Aguarde alguns segundos e tente de novo."
          : "Erro ao buscar no Google. Verifique a conexão.",
      );
    } finally {
      setLoading(false);
    }
  }

  function execute(query: string) {
    Keyboard.dismiss();
    setSearched(true);
    setResults([]);
    setNextPageToken(undefined);
    setLastQuery(query);
    runSearch(query);
  }

  // Biases the query to an area when we have one; falls back to a plain keyword otherwise
  // (avoids a dangling "comércio em " when reverse-geocode yields nothing).
  function buildNearQuery(keyword: string, area: string): string {
    const base = keyword || "comércio";
    return area ? `${base} em ${area}` : base;
  }

  function onSearch() {
    const kw = term.trim();
    if (nearby) {
      execute(buildNearQuery(kw, nearby.queryArea));
    } else if (kw) {
      execute(kw);
    }
  }

  async function onNearMe() {
    setLocating(true);
    setError(null);
    try {
      const ctx = await getNearbyContext();
      setNearby(ctx);
      execute(buildNearQuery(term.trim(), ctx.queryArea));
    } catch (e) {
      if (e instanceof LocationPermissionError) {
        Alert.alert("Localização", "Permissão de localização negada. Ative nos Ajustes para buscar perto de você.");
      } else {
        Alert.alert("Localização", "Não foi possível obter sua localização.");
      }
    } finally {
      setLocating(false);
    }
  }

  function onPick(place: Place) {
    setSelectedPlace(place, lastQuery);
    router.push("/confirm-lead");
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          value={term}
          onChangeText={setTerm}
          onSubmitEditing={onSearch}
          returnKeyType="search"
          placeholder="O que procura? (ex.: padaria, restaurante)"
          placeholderTextColor="#8a6d9c"
          style={styles.input}
        />
        <Pressable style={({ pressed }) => [styles.searchBtn, pressed && styles.pressed]} onPress={onSearch}>
          <Text style={styles.searchBtnText}>Buscar</Text>
        </Pressable>
      </View>

      <Pressable style={({ pressed }) => [styles.nearBtn, pressed && styles.pressed]} onPress={onNearMe} disabled={locating}>
        {locating ? <ActivityIndicator size="small" color="#c9b3d6" /> : <Text style={styles.nearBtnText}>📍 Perto de mim</Text>}
      </Pressable>

      {nearby && (
        <View style={styles.chip}>
          <Text style={styles.chipText}>📍 {nearby.label}</Text>
          <Pressable onPress={() => setNearby(null)} hitSlop={8}>
            <Text style={styles.chipX}>✕</Text>
          </Pressable>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={results}
        keyExtractor={(p) => p.placeId}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={() => onPick(item)}>
            <Text style={styles.name}>{item.businessName}</Text>
            {!!item.address && <Text style={styles.addr}>{item.address}</Text>}
            <View style={styles.metaRow}>
              {!!(item.internationalPhone ?? item.phone) && <Text style={styles.meta}>📞 {item.internationalPhone ?? item.phone}</Text>}
              {typeof item.rating === "number" && <Text style={styles.meta}>⭐ {item.rating.toFixed(1)}{item.userRatingCount ? ` (${item.userRatingCount})` : ""}</Text>}
            </View>
          </Pressable>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            {loading && <ActivityIndicator color="#c9b3d6" />}
            {!loading && nextPageToken && (
              <Pressable style={({ pressed }) => [styles.moreBtn, pressed && styles.pressed]} onPress={() => runSearch(lastQuery, nextPageToken)}>
                <Text style={styles.moreBtnText}>Carregar mais</Text>
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={!loading && searched ? <Text style={styles.empty}>Nenhum resultado. Tente outros termos.</Text> : null}
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
  nearBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderColor: "#4d2b5d",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  nearBtnText: { color: "#c9b3d6", fontWeight: "600", fontSize: 13 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: "#2a1533",
    borderColor: "#762991",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { color: "#e9dcf0", fontSize: 12, fontWeight: "600" },
  chipX: { color: "#b79ec6", fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.7 },
  error: { color: "#f2a5a5", marginTop: 12 },
  list: { paddingVertical: 12, gap: 10 },
  card: { backgroundColor: "#2a1533", borderColor: "#4d2b5d", borderWidth: 1, borderRadius: 14, padding: 14 },
  name: { color: "#fff", fontSize: 16, fontWeight: "600" },
  addr: { color: "#b79ec6", fontSize: 13, marginTop: 2 },
  metaRow: { flexDirection: "row", gap: 14, marginTop: 8, flexWrap: "wrap" },
  meta: { color: "#c9b3d6", fontSize: 12 },
  footer: { paddingVertical: 16, alignItems: "center" },
  moreBtn: { borderColor: "#4d2b5d", borderWidth: 1, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  moreBtnText: { color: "#c9b3d6", fontWeight: "600" },
  empty: { color: "#8a6d9c", textAlign: "center", marginTop: 24 },
});
