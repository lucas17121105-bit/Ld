import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/lib/api";
import { colors, radius, spacing } from "@/src/theme/tokens";

type Exercise = {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url?: string | null;
  duration_seconds: number;
};
type PlanItem = { exercise_id: string; sets: number; reps: number; notes: string };
type Plan = {
  id: string;
  title: string;
  description: string;
  items: PlanItem[];
  is_active: boolean;
  created_at?: string;
};

export default function PlanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [exMap, setExMap] = useState<Record<string, Exercise>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [p, ex] = await Promise.all([
        api<Plan>(`/plans/${id}`),
        api<Exercise[]>("/exercises"),
      ]);
      setPlan(p);
      const m: Record<string, Exercise> = {};
      ex.forEach((e) => (m[e.id] = e));
      setExMap(m);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }
  if (!plan) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.onSurface }}>Treino não encontrado</Text>
      </View>
    );
  }

  const created = plan.created_at
    ? new Date(plan.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="plan-detail">
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.iconBtn}
          testID="back-button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>TREINO</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        <View style={styles.header}>
          <Text style={styles.title}>{plan.title}</Text>
          {plan.description ? (
            <Text style={styles.desc}>{plan.description}</Text>
          ) : null}
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="list" size={14} color={colors.onSurface} />
              <Text style={styles.metaPillText}>
                {plan.items.length} exercícios
              </Text>
            </View>
            {created ? (
              <View style={styles.metaPill}>
                <Ionicons name="calendar" size={14} color={colors.onSurface} />
                <Text style={styles.metaPillText}>{created}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={styles.section}>EXERCÍCIOS DO TREINO</Text>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {plan.items.map((item, idx) => {
            const ex = exMap[item.exercise_id];
            if (!ex) return null;
            return (
              <Pressable
                key={`${item.exercise_id}-${idx}`}
                testID={`plan-item-${idx}`}
                onPress={() => router.push(`/exercise/${ex.id}`)}
                style={({ pressed }) => [
                  styles.exRow,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.exIndex}>
                  <Text style={styles.exIndexText}>{idx + 1}</Text>
                </View>
                <Image
                  source={{ uri: ex.thumbnail_url ?? undefined }}
                  style={styles.exThumb}
                  contentFit="cover"
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.exTitle} numberOfLines={1}>
                    {ex.title}
                  </Text>
                  <Text style={styles.exMeta}>
                    {item.sets}×{item.reps} · {ex.category}
                  </Text>
                  {item.notes ? (
                    <Text style={styles.exNotes} numberOfLines={1}>
                      {item.notes}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.onSurface} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    color: colors.onSurface,
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "800",
  },
  header: { padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.onSurface, fontSize: 28, fontWeight: "900" },
  desc: { color: colors.onSurfaceTertiary, fontSize: 14, lineHeight: 20 },
  metaRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  metaPillText: { color: colors.onSurface, fontSize: 12, fontWeight: "700" },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "800",
  },
  exRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exIndex: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  exIndexText: { color: colors.onSurface, fontWeight: "900", fontSize: 13 },
  exThumb: {
    width: 64,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceTertiary,
  },
  exTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  exMeta: { color: colors.brand, fontSize: 12, fontWeight: "700" },
  exNotes: { color: colors.onSurfaceTertiary, fontSize: 12, fontStyle: "italic" },
});
