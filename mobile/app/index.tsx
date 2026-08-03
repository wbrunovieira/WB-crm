import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
import { hasToken } from "@/lib/auth";

type Mode = { key: string; route: Href; title: string; subtitle: string; emoji: string };

const MODES: Mode[] = [
  { key: "google", route: "/google", title: "Google Meus Negócios", subtitle: "Buscar a loja e cadastrar com os dados do Google", emoji: "🔎" },
  { key: "card", route: "/card", title: "Cartão / Panfleto", subtitle: "Tirar foto e transcrever os dados", emoji: "📇" },
  { key: "gps", route: "/gps", title: "Endereço por GPS", subtitle: "Preencher o endereço pela localização", emoji: "📍" },
  { key: "manual", route: "/manual", title: "Cadastro manual", subtitle: "Digitar os dados do lead", emoji: "✍️" },
];

export default function Home() {
  const router = useRouter();

  // Is a usable token present at runtime (Keychain or embedded)? Drives the check below.
  const tokenQuery = useQuery({ queryKey: ["has-token"], queryFn: hasToken });

  // Lightweight authed ping to confirm the token actually works.
  const check = useQuery({
    queryKey: ["connection-check"],
    queryFn: () => apiFetch<string[]>("/leads/source-groups"),
    enabled: tokenQuery.data === true,
  });

  const status = useMemo(() => {
    if (tokenQuery.isLoading) return { tone: "muted", label: "Verificando token…" } as const;
    if (tokenQuery.data === false) return { tone: "warn", label: "Token não configurado — veja o README" } as const;
    if (check.isLoading) return { tone: "muted", label: "Verificando conexão…" } as const;
    if (check.isError) {
      const e = check.error;
      const msg = e instanceof ApiError && (e.status === 401 || e.status === 403) ? "Token inválido/expirado" : "Sem conexão com o CRM";
      return { tone: "error", label: msg } as const;
    }
    return { tone: "ok", label: "Conectado ao CRM" } as const;
  }, [tokenQuery.isLoading, tokenQuery.data, check.isLoading, check.isError, check.error]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.pill, pillTone[status.tone]]}>
        {status.tone === "muted" && <ActivityIndicator size="small" color="#c9b3d6" />}
        <Text style={styles.pillText}>{status.label}</Text>
      </View>

      <Text style={styles.heading}>Cadastrar lead</Text>
      <Text style={styles.sub}>Escolha como capturar o lead em campo.</Text>

      <View style={styles.grid}>
        {MODES.map((m) => (
          <Pressable
            key={m.key}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(m.route)}
          >
            <Text style={styles.emoji}>{m.emoji}</Text>
            <Text style={styles.cardTitle}>{m.title}</Text>
            <Text style={styles.cardSub}>{m.subtitle}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const pillTone: Record<string, object> = {
  ok: { backgroundColor: "#14351f", borderColor: "#2f7d4f" },
  warn: { backgroundColor: "#3a2e12", borderColor: "#8a6d1f" },
  error: { backgroundColor: "#3a1414", borderColor: "#8a2f2f" },
  muted: { backgroundColor: "#2a1533", borderColor: "#4d2b5d" },
};

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  pillText: { color: "#e9dcf0", fontSize: 12, fontWeight: "600" },
  heading: { color: "#fff", fontSize: 26, fontWeight: "700" },
  sub: { color: "#b79ec6", fontSize: 14, marginBottom: 12 },
  grid: { gap: 12 },
  card: {
    backgroundColor: "#2a1533",
    borderColor: "#4d2b5d",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  cardPressed: { opacity: 0.7 },
  emoji: { fontSize: 28, marginBottom: 8 },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  cardSub: { color: "#b79ec6", fontSize: 13, marginTop: 4 },
});
