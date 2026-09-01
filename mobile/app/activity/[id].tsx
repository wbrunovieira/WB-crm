import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  getActivity,
  activityStatus,
  formatDuration,
  transcriptToText,
  type ActivityStatus,
} from "@/lib/activities";

const TYPE_ICON: Record<string, string> = {
  physical_visit: "📍",
  meeting: "🤝",
  call: "📞",
  whatsapp: "💬",
  email: "✉️",
  task: "📋",
  instagram_dm: "📸",
};

const TYPE_LABEL: Record<string, string> = {
  physical_visit: "Visita",
  meeting: "Reunião",
  call: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  task: "Tarefa",
  instagram_dm: "Instagram DM",
};

/** GoTo's raw outcome values, in pt-BR. "unknown" is deliberately absent: it is the most common
 *  value in the data (126 rows) and means the pipeline could not classify the call — printing
 *  "Resultado: unknown" tells the rep less than showing nothing. */
const CALL_OUTCOME: Record<string, string> = {
  answered: "Atendida",
  voicemail: "Caixa postal",
  no_answer: "Não atendeu",
  invalid_number: "Número inválido",
  busy: "Ocupado",
};

const STATUS: Record<ActivityStatus, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "#f59e0b" },
  done: { label: "✓ Concluída", color: "#22c55e" },
  failed: { label: "Falhou", color: "#ef4444" },
  skipped: { label: "Pulada", color: "#94a3b8" },
};

function formatDateTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Full detail of one activity, reached by tapping a row in the lead or organization screen —
 *  those rows only ever showed a truncated subject and a date. */
export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const query = useQuery({
    queryKey: ["activity", id],
    queryFn: () => getActivity(id!),
    enabled: !!id,
  });

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c9b3d6" size="large" />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Não foi possível carregar a atividade.</Text>
      </View>
    );
  }

  const a = query.data;
  const status = STATUS[activityStatus(a)];
  const duration = formatDuration(a.gotoDuration);
  const callOutcome = a.gotoCallOutcome ? CALL_OUTCOME[a.gotoCallOutcome] : null;
  const transcript = transcriptToText(a.gotoTranscriptText);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {TYPE_ICON[a.type] ?? "•"} {a.subject}
        </Text>
      </View>
      <View style={styles.badgeRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{TYPE_LABEL[a.type] ?? a.type}</Text>
        </View>
        <Text style={[styles.status, { color: status.color }]}>{status.label}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quando</Text>
        {formatDateTime(a.dueDate) && (
          <Text style={styles.field}>📅 Agendada: {formatDateTime(a.dueDate)}</Text>
        )}
        {formatDateTime(a.completedAt) && (
          <Text style={styles.field}>✅ Concluída: {formatDateTime(a.completedAt)}</Text>
        )}
        {formatDateTime(a.failedAt) && (
          <Text style={styles.field}>❌ Falhou: {formatDateTime(a.failedAt)}</Text>
        )}
        {formatDateTime(a.skippedAt) && (
          <Text style={styles.field}>⏭️ Pulada: {formatDateTime(a.skippedAt)}</Text>
        )}
        <Text style={styles.fieldMuted}>Criada: {formatDateTime(a.createdAt)}</Text>
      </View>

      {(a.failReason || a.skipReason || a.meetingNoShow) && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Motivo</Text>
          {a.failReason && <Text style={styles.field}>{a.failReason}</Text>}
          {a.skipReason && <Text style={styles.field}>{a.skipReason}</Text>}
          {a.meetingNoShow && <Text style={styles.field}>O cliente não compareceu.</Text>}
        </View>
      )}

      {a.description ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Anotações</Text>
          <Text style={styles.body}>{a.description}</Text>
        </View>
      ) : null}

      {(duration || callOutcome) && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ligação</Text>
          {duration && <Text style={styles.field}>⏱️ Duração: {duration}</Text>}
          {callOutcome && <Text style={styles.field}>Resultado: {callOutcome}</Text>}
        </View>
      )}

      {transcript ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Transcrição</Text>
          <Text style={styles.body}>{transcript}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Vinculada a</Text>
        {a.lead && (
          <Pressable style={styles.linkRow} onPress={() => router.push(`/lead/${a.lead!.id}`)}>
            <Text style={styles.linkText}>🎯 {a.lead.businessName}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
        {a.organization && (
          <Pressable style={styles.linkRow} onPress={() => router.push(`/org/${a.organization!.id}`)}>
            <Text style={styles.linkText}>🏢 {a.organization.name}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
        {/* Contacts, partners and deals have no mobile screen yet — shown as plain text so the
            row does not look tappable and then do nothing. */}
        {a.contact && <Text style={styles.field}>👤 {a.contact.name}</Text>}
        {a.partner && <Text style={styles.field}>🤝 {a.partner.name}</Text>}
        {a.deal && <Text style={styles.field}>💼 {a.deal.title}</Text>}
        {!a.lead && !a.organization && !a.contact && !a.partner && !a.deal && (
          <Text style={styles.emptyText}>Sem vínculo.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1a0022" },
  header: { gap: 6 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700" },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: -6 },
  typeBadge: {
    backgroundColor: "#2a1533",
    borderColor: "#4d2b5d",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  typeBadgeText: { color: "#c9b3d6", fontSize: 12, fontWeight: "600" },
  status: { fontSize: 13, fontWeight: "700" },
  card: {
    backgroundColor: "#2a1533",
    borderColor: "#4d2b5d",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  field: { color: "#e7d9ee", fontSize: 14 },
  fieldMuted: { color: "#9b86a8", fontSize: 12 },
  body: { color: "#e7d9ee", fontSize: 14, lineHeight: 20 },
  emptyText: { color: "#9b86a8", fontSize: 13, fontStyle: "italic" },
  errorText: { color: "#ef9a9a", fontSize: 15 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  linkText: { color: "#c9a3e0", fontSize: 14, fontWeight: "600", flex: 1 },
  chevron: { color: "#9b86a8", fontSize: 20 },
});
