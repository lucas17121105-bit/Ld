import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/src/lib/api";
import { colors, radius, spacing } from "@/src/theme/tokens";

type Stats = {
  students: number;
  admins: number;
  exercises: number;
  plans: number;
  completions: number;
};

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  students: "people",
  exercises: "film",
  plans: "clipboard",
  completions: "checkmark-done",
};

const LABELS: Record<string, string> = {
  students: "Alunos",
  exercises: "Exercícios",
  plans: "Treinos atribuídos",
  completions: "Conclusões",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const s = await api<Stats>("/admin/stats");
        setStats(s);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ScrollView testID="admin-dashboard">
      <Text style={styles.h1}>Painel do Treinador</Text>
      <Text style={styles.sub}>
        Visão geral do app — alunos, biblioteca e treinos.
      </Text>
      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.grid}>
          {(["students", "exercises", "plans", "completions"] as const).map((k) => (
            <View key={k} style={styles.card} testID={`stat-${k}`}>
              <View style={styles.iconWrap}>
                <Ionicons
                  name={ICONS[k]}
                  size={20}
                  color={colors.onSurface}
                />
              </View>
              <Text style={styles.metricValue}>{stats?.[k] ?? 0}</Text>
              <Text style={styles.metricLabel}>{LABELS[k]}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.onSurface, fontSize: 28, fontWeight: "800" },
  sub: { color: colors.onSurfaceTertiary, marginTop: 6, marginBottom: spacing.xl },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg },
  card: {
    minWidth: 200,
    flexBasis: 220,
    flexGrow: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: { color: colors.onSurface, fontSize: 36, fontWeight: "900" },
  metricLabel: { color: colors.onSurfaceTertiary, fontSize: 13 },
});
