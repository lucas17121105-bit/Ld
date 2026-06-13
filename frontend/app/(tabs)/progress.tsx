import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/src/lib/api";
import { colors, radius, spacing } from "@/src/theme/tokens";

type ProgressItem = {
  id: string;
  exercise_id: string;
  plan_id?: string | null;
  completed_at: string;
};
type Stats = { total_completed: number; completed_last_7_days: number };
type Exercise = { id: string; title: string; category: string };

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [exMap, setExMap] = useState<Record<string, Exercise>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [p, s, ex] = await Promise.all([
        api<ProgressItem[]>("/progress/me"),
        api<Stats>("/users/me/stats"),
        api<Exercise[]>("/exercises"),
      ]);
      setItems(p);
      setStats(s);
      const m: Record<string, Exercise> = {};
      ex.forEach((e) => (m[e.id] = e));
      setExMap(m);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="progress-screen">
      <Text style={styles.title}>Progresso</Text>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>TOTAL</Text>
          <Text style={styles.metricValue} testID="stat-total">
            {stats?.total_completed ?? 0}
          </Text>
          <Text style={styles.metricSub}>concluídos</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>7 DIAS</Text>
          <Text style={styles.metricValue} testID="stat-week">
            {stats?.completed_last_7_days ?? 0}
          </Text>
          <Text style={styles.metricSub}>esta semana</Text>
        </View>
      </View>

      <Text style={styles.section}>HISTÓRICO RECENTE</Text>
      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="trophy-outline" size={42} color={colors.onSurfaceTertiary} />
          <Text style={styles.emptyText}>
            Comece a treinar para ver suas estatísticas aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.sm }}
          renderItem={({ item }) => {
            const ex = exMap[item.exercise_id];
            const dt = new Date(item.completed_at);
            return (
              <View style={styles.histRow}>
                <View style={styles.histDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.histTitle} numberOfLines={1}>
                    {ex?.title ?? "Exercício"}
                  </Text>
                  <Text style={styles.histMeta}>
                    {dt.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  title: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    color: colors.onSurface,
    fontSize: 28,
    fontWeight: "800",
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 4,
  },
  metricLabel: { color: colors.brand, fontSize: 11, letterSpacing: 2, fontWeight: "700" },
  metricValue: { color: colors.onSurface, fontSize: 36, fontWeight: "800" },
  metricSub: { color: colors.onSurfaceTertiary, fontSize: 12 },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "700",
  },
  histRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  histDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  histTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "600" },
  histMeta: { color: colors.onSurfaceTertiary, fontSize: 12, marginTop: 2 },
  empty: { alignItems: "center", gap: spacing.md, marginTop: spacing.xxxl, paddingHorizontal: spacing.xl },
  emptyText: { color: colors.onSurfaceTertiary, fontSize: 14, textAlign: "center" },
});
