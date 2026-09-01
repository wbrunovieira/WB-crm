import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  getOrganization,
  sortOrgActivities,
  formatOrgAddress,
  type OrgActivity,
} from "@/lib/organizations";

function digits(s: string): string {
  return s.replace(/\D/g, "");
}

/** `tel:` needs the leading "+" to be recognized as international — same fix as lead/[id].tsx. */
function telHref(raw: string): string {
  return `tel:${raw.trim().startsWith("+") ? "+" : ""}${digits(raw)}`;
}

const TYPE_ICON: Record<string, string> = {
  physical_visit: "📍",
  meeting: "🤝",
  call: "📞",
  whatsapp: "💬",
  email: "✉️",
  task: "📋",
  instagram_dm: "📸",
};

function activityIcon(type: string): string {
  return TYPE_ICON[type] ?? "•";
}

/** Final state of an activity — `completed` wins over the outcome timestamps, since an activity
 *  can be marked failed and later completed. */
function activityStatus(a: OrgActivity): { label: string; color: string } {
  if (a.completed) return { label: "Concluída", color: "#22c55e" };
  if (a.failedAt) return { label: "Falhou", color: "#ef4444" };
  if (a.skippedAt) return { label: "Pulada", color: "#94a3b8" };
  return { label: "Pendente", color: "#f59e0b" };
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** Organization detail — the mobile counterpart of lead/[id].tsx, for companies already
 *  converted from a lead. Read-only for now: in the field what is needed is who to call, where
 *  to go, and what has already been done here. */
export default function OrgDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const orgQuery = useQuery({
    queryKey: ["organization", id],
    queryFn: () => getOrganization(id!),
    enabled: !!id,
  });

  if (orgQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c9b3d6" size="large" />
      </View>
    );
  }

  if (orgQuery.isError || !orgQuery.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Não foi possível carregar a empresa.</Text>
      </View>
    );
  }

  const org = orgQuery.data;
  const address = formatOrgAddress(org);
  const contacts = org.contacts ?? [];
  const activities = sortOrgActivities(org.activities ?? []);
  const pendingCount = activities.filter((a) => !a.completed && !a.failedAt && !a.skippedAt).length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{org.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Cliente</Text>
        </View>
      </View>
      {org.legalName && org.legalName !== org.name && (
        <Text style={styles.subtitle}>{org.legalName}</Text>
      )}

      <View style={styles.actionsRow}>
        {org.phone && (
          <Pressable style={styles.action} onPress={() => Linking.openURL(telHref(org.phone!))}>
            <Text style={styles.actionText}>📞 Ligar</Text>
          </Pressable>
        )}
        {org.whatsapp && (
          <Pressable
            style={styles.action}
            onPress={() => Linking.openURL(`https://wa.me/${digits(org.whatsapp!)}`)}
          >
            <Text style={styles.actionText}>💬 WhatsApp</Text>
          </Pressable>
        )}
        {address && (
          <Pressable
            style={styles.action}
            onPress={() => Linking.openURL(`https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`)}
          >
            <Text style={styles.actionText}>🚗 Waze</Text>
          </Pressable>
        )}
        {org.website && (
          <Pressable
            style={styles.action}
            onPress={() =>
              Linking.openURL(org.website!.startsWith("http") ? org.website! : `https://${org.website}`)
            }
          >
            <Text style={styles.actionText}>🌐 Site</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dados</Text>
        {address && <Text style={styles.field}>📍 {address}</Text>}
        {org.phone && <Text style={styles.field}>📞 {org.phone}</Text>}
        {org.email && <Text style={styles.field}>✉️ {org.email}</Text>}
        {org.industry && <Text style={styles.field}>🏷️ {org.industry}</Text>}
        {!address && !org.phone && !org.email && !org.industry && (
          <Text style={styles.emptyText}>Sem dados cadastrados.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Contatos ({contacts.length})</Text>
        {contacts.length === 0 && <Text style={styles.emptyText}>Nenhum contato cadastrado.</Text>}
        {contacts.map((c) => (
          <View key={c.id} style={styles.contactRow}>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>
                {c.name}
                {c.isPrimary ? " ⭐" : ""}
              </Text>
              {c.role && <Text style={styles.contactRole}>{c.role}</Text>}
            </View>
            <View style={styles.contactActions}>
              {c.phone && (
                <Pressable onPress={() => Linking.openURL(telHref(c.phone!))} hitSlop={8}>
                  <Text style={styles.contactIcon}>📞</Text>
                </Pressable>
              )}
              {c.whatsapp && (
                <Pressable
                  onPress={() => Linking.openURL(`https://wa.me/${digits(c.whatsapp!)}`)}
                  hitSlop={8}
                >
                  <Text style={styles.contactIcon}>💬</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Atividades ({activities.length}
          {pendingCount > 0 ? ` · ${pendingCount} pendente${pendingCount > 1 ? "s" : ""}` : ""})
        </Text>
        {activities.length === 0 && <Text style={styles.emptyText}>Nenhuma atividade registrada.</Text>}
        {activities.map((a) => {
          const status = activityStatus(a);
          return (
            <View key={a.id} style={styles.activityRow}>
              <View style={styles.activityHeader}>
                <Text style={styles.activitySubject}>
                  {activityIcon(a.type)} {a.subject}
                </Text>
                <Text style={[styles.activityStatus, { color: status.color }]}>{status.label}</Text>
              </View>
              {formatDate(a.dueDate) && <Text style={styles.activityMeta}>{formatDate(a.dueDate)}</Text>}
              {a.description ? (
                <Text style={styles.activityDescription} numberOfLines={4}>
                  {a.description}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1a0022" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", flex: 1 },
  subtitle: { color: "#c9b3d6", fontSize: 13, marginTop: -8 },
  badge: {
    backgroundColor: "#2a1533",
    borderColor: "#f59e0b",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: { color: "#f59e0b", fontSize: 12, fontWeight: "600" },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: {
    backgroundColor: "#762991",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  card: {
    backgroundColor: "#2a1533",
    borderColor: "#4d2b5d",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  field: { color: "#e7d9ee", fontSize: 14 },
  emptyText: { color: "#9b86a8", fontSize: 13, fontStyle: "italic" },
  errorText: { color: "#ef9a9a", fontSize: 15 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopColor: "#4d2b5d",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 10,
  },
  contactInfo: { flex: 1 },
  contactName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  contactRole: { color: "#c9b3d6", fontSize: 12 },
  contactActions: { flexDirection: "row", gap: 14 },
  contactIcon: { fontSize: 20 },
  activityRow: {
    borderTopColor: "#4d2b5d",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 3,
  },
  activityHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  activitySubject: { color: "#fff", fontSize: 14, fontWeight: "600", flex: 1 },
  activityStatus: { fontSize: 11, fontWeight: "700" },
  activityMeta: { color: "#9b86a8", fontSize: 12 },
  activityDescription: { color: "#c9b3d6", fontSize: 13 },
});
