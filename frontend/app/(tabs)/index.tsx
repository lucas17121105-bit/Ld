import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { colors, radius, spacing } from "@/src/theme/tokens";

type PlanItem = { exercise_id: string; sets: number; reps: number; notes: string };
type Plan = {
  id: string;
  title: string;
  description: string;
  items: PlanItem[];
  is_active: boolean;
  created_at?: string;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await api<Plan[]>("/plans/me");
      setPlans(p);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activePlans = plans.filter((p) => p.is_active);
  const inactivePlans = plans.filter((p) => !p.is_active);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="home-screen">
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.brand}
          />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hi}>Olá,</Text>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name?.split(" ")[0] ?? "Atleta"}
            </Text>
          </View>
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={20} color={colors.onSurface} />
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
        ) : plans.length === 0 ? (
          <View style={styles.empty} testID="home-empty">
            <Ionicons name="calendar-outline" size={42} color={colors.brand} />
            <Text style={styles.emptyTitle}>Nenhum treino atribuído</Text>
            <Text style={styles.emptySub}>
              Seu professor ainda não criou um plano. Enquanto isso, explore a
              biblioteca.
            </Text>
            <Pressable
              testID="goto-library"
              onPress={() => router.push("/(tabs)/library")}
              style={styles.emptyCta}
            >
              <Text style={styles.emptyCtaText}>Ir para Biblioteca</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {activePlans.length > 0 ? (
              <>
                <Text style={styles.section}>TREINOS ATIVOS</Text>
                <View style={styles.planList}>
                  {activePlans.map((p, idx) => (
                    <PlanCard
                      key={p.id}
                      plan={p}
                      index={idx}
                      onPress={() => router.push(`/plan/${p.id}`)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {inactivePlans.length > 0 ? (
              <>
                <Text style={styles.section}>HISTÓRICO DE TREINOS</Text>
                <View style={styles.planList}>
                  {inactivePlans.map((p, idx) => (
                    <PlanCard
                      key={p.id}
                      plan={p}
                      index={idx}
                      onPress={() => router.push(`/plan/${p.id}`)}
                      dimmed
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function PlanCard({
  plan,
  index,
  onPress,
  dimmed = false,
}: {
  plan: Plan;
  index: number;
  onPress: () => void;
  dimmed?: boolean;
}) {
  const created = plan.created_at
    ? new Date(plan.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })
    : null;
  return (
    <Pressable
      testID={`plan-card-${plan.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.planCard,
        dimmed && styles.planCardDim,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={styles.planNum}>
        <Text style={styles.planNumText}>{String(index + 1).padStart(2, "0")}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.planTitle} numberOfLines={1}>
          {plan.title}
        </Text>
        <View style={styles.planMetaRow}>
          <Text style={styles.planMeta}>
            {plan.items.length} exercícios
          </Text>
          {created ? (
            <>
              <View style={styles.dot} />
              <Text style={styles.planMeta}>{created}</Text>
            </>
          ) : null}
          {plan.is_active ? (
            <>
              <View style={styles.dot} />
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ATIVO</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>
      <View style={styles.playWrap}>
        <Ionicons name="chevron-forward" size={22} color={colors.onSurface} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hi: { color: colors.onSurfaceTertiary, fontSize: 14 },
  name: { color: colors.onSurface, fontSize: 22, fontWeight: "800" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  empty: {
    margin: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  emptySub: { color: colors.onSurfaceTertiary, fontSize: 14, textAlign: "center" },
  emptyCta: {
    marginTop: spacing.md,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  emptyCtaText: { color: colors.onSurface, fontWeight: "800" },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "800",
  },
  planList: { paddingHorizontal: spacing.lg, gap: spacing.md },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 84,
  },
  planCardDim: { opacity: 0.65 },
  planNum: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  planNumText: { color: colors.onSurface, fontWeight: "900", fontSize: 16 },
  planTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "800" },
  planMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  planMeta: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "600" },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.onSurfaceTertiary },
  activeBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  activeBadgeText: { color: "#fff", fontWeight: "900", fontSize: 10, letterSpacing: 1 },
  playWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
});
