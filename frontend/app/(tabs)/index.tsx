import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useFocusEffect, useRouter } from "expo-router";

import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { colors, radius, spacing } from "@/src/theme/tokens";
import CelebrationModal from "@/src/components/CelebrationModal";

type PlanItem = { exercise_id: string; sets: number; reps: number; notes: string };
type Plan = {
  id: string;
  title: string;
  description: string;
  items: PlanItem[];
  is_active: boolean;
  created_at?: string;
};
type Cycle = {
  last_reset_at: string;
  completed_exercise_ids: string[];
  required_exercise_ids: string[];
  all_done: boolean;
  active_plan_count: number;
};
type Streak = {
  id: string;
  user_id: string;
  completed_at: string;
  week_start: string;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, c, s] = await Promise.all([
        api<Plan[]>("/plans/me"),
        api<Cycle>("/cycle/me"),
        api<Streak[]>("/streak/me"),
      ]);
      setPlans(p);
      setCycle(c);
      setStreaks(s);
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const completedSet = useMemo(
    () => new Set(cycle?.completed_exercise_ids ?? []),
    [cycle]
  );

  const activePlans = plans.filter((p) => p.is_active);
  const inactivePlans = plans.filter((p) => !p.is_active);

  const isPlanComplete = useCallback(
    (plan: Plan) =>
      plan.items.length > 0 &&
      plan.items.every((it) => completedSet.has(it.exercise_id)),
    [completedSet]
  );

  const canFinishWeek =
    !!cycle && cycle.all_done && cycle.active_plan_count > 0;

  const handleFinishWeek = async () => {
    if (!canFinishWeek || submitting) return;
    setSubmitting(true);
    setErrMsg(null);
    try {
      await api("/streak/complete-week", { method: "POST" });
      const newStreaks = await api<Streak[]>("/streak/me");
      setStreaks(newStreaks);
      setShowCelebration(true);
      // refresh cycle so cards reset to non-green
      const c = await api<Cycle>("/cycle/me");
      setCycle(c);
    } catch (e: any) {
      setErrMsg(e?.message ?? "Erro ao finalizar semana");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="home-screen">
      <ScrollView
        contentContainerStyle={{
          paddingBottom: activePlans.length > 0 ? 140 : spacing.xxxl,
        }}
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
          <View style={styles.streakChip}>
            <Ionicons name="flame" size={16} color={colors.onSurface} />
            <Text style={styles.streakChipText}>{streaks.length}</Text>
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
                  {activePlans.map((p, idx) => {
                    const total = p.items.length;
                    const done = p.items.filter((it) =>
                      completedSet.has(it.exercise_id)
                    ).length;
                    return (
                      <PlanCard
                        key={p.id}
                        plan={p}
                        index={idx}
                        done={done}
                        total={total}
                        complete={isPlanComplete(p)}
                        onPress={() => router.push(`/plan/${p.id}`)}
                      />
                    );
                  })}
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
                      done={0}
                      total={p.items.length}
                      complete={false}
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

      {activePlans.length > 0 ? (
        <View
          style={[
            styles.footerWrap,
            { paddingBottom: insets.bottom + spacing.md },
          ]}
          pointerEvents="box-none"
        >
          <Pressable
            testID="finish-week-button"
            disabled={!canFinishWeek || submitting}
            onPress={handleFinishWeek}
            style={({ pressed }) => [
              styles.finishBtn,
              !canFinishWeek && styles.finishBtnDisabled,
              canFinishWeek && pressed && { opacity: 0.85 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.onSurface} />
            ) : (
              <>
                <Ionicons
                  name={canFinishWeek ? "trophy" : "lock-closed"}
                  size={20}
                  color={
                    canFinishWeek ? colors.onSurface : colors.onSurfaceTertiary
                  }
                />
                <Text
                  style={[
                    styles.finishBtnText,
                    !canFinishWeek && { color: colors.onSurfaceTertiary },
                  ]}
                >
                  {canFinishWeek
                    ? "Terminei meus treinos semanais"
                    : `Conclua todos os exercícios (${cycle?.completed_exercise_ids.length ?? 0}/${cycle?.required_exercise_ids.length ?? 0})`}
                </Text>
              </>
            )}
          </Pressable>
          {errMsg ? (
            <Text style={styles.errMsg} testID="finish-error">
              {errMsg}
            </Text>
          ) : null}
        </View>
      ) : null}

      <CelebrationModal
        visible={showCelebration}
        onClose={() => setShowCelebration(false)}
        streaks={streaks}
      />
    </View>
  );
}

function PlanCard({
  plan,
  index,
  done,
  total,
  complete,
  onPress,
  dimmed = false,
}: {
  plan: Plan;
  index: number;
  done: number;
  total: number;
  complete: boolean;
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
        complete && styles.planCardDone,
        dimmed && styles.planCardDim,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={[styles.planNum, complete && styles.planNumDone]}>
        {complete ? (
          <Ionicons name="checkmark" size={22} color="#fff" />
        ) : (
          <Text style={styles.planNumText}>
            {String(index + 1).padStart(2, "0")}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={[styles.planTitle, complete && { color: "#fff" }]}
          numberOfLines={1}
        >
          {plan.title}
        </Text>
        <View style={styles.planMetaRow}>
          <Text
            style={[
              styles.planMeta,
              complete && { color: "rgba(255,255,255,0.85)" },
            ]}
          >
            {plan.is_active ? `${done}/${total}` : `${total}`} exercícios
          </Text>
          {created ? (
            <>
              <View
                style={[
                  styles.dot,
                  complete && { backgroundColor: "rgba(255,255,255,0.85)" },
                ]}
              />
              <Text
                style={[
                  styles.planMeta,
                  complete && { color: "rgba(255,255,255,0.85)" },
                ]}
              >
                {created}
              </Text>
            </>
          ) : null}
          {plan.is_active && !complete ? (
            <>
              <View style={styles.dot} />
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ATIVO</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>
      <View style={[styles.playWrap, complete && styles.playWrapDone]}>
        <Ionicons
          name="chevron-forward"
          size={22}
          color={complete ? "#fff" : colors.onSurface}
        />
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
    gap: spacing.sm,
  },
  hi: { color: colors.onSurfaceTertiary, fontSize: 14 },
  name: { color: colors.onSurface, fontSize: 22, fontWeight: "800" },
  streakChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  streakChipText: { color: colors.onSurface, fontWeight: "900", fontSize: 14 },
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
  planCardDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
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
  planNumDone: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.3)",
  },
  planNumText: { color: colors.onSurface, fontWeight: "900", fontSize: 16 },
  planTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "800" },
  planMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  planMeta: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "600" },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.onSurfaceTertiary },
  activeBadge: {
    backgroundColor: colors.info,
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
  playWrapDone: { backgroundColor: "rgba(255,255,255,0.2)" },
  footerWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  finishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand,
    paddingVertical: 18,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  finishBtnDisabled: {
    backgroundColor: colors.surfaceTertiary,
    borderColor: colors.border,
  },
  finishBtnText: {
    color: colors.onSurface,
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  errMsg: {
    color: colors.error,
    marginTop: spacing.sm,
    textAlign: "center",
    fontSize: 13,
  },
});
