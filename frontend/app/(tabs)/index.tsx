import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { colors, radius, spacing } from "@/src/theme/tokens";

type Exercise = {
  id: string;
  title: string;
  description: string;
  category: string;
  video_url?: string | null;
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
};

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [exMap, setExMap] = useState<Record<string, Exercise>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, ex] = await Promise.all([
        api<Plan[]>("/plans/me"),
        api<Exercise[]>("/exercises"),
      ]);
      setPlans(p);
      const m: Record<string, Exercise> = {};
      ex.forEach((e) => (m[e.id] = e));
      setExMap(m);
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

  const activePlan = plans.find((p) => p.is_active) ?? plans[0];

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
          <View>
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
        ) : activePlan ? (
          <View style={styles.heroWrap}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1765910226872-e8811bd45d3e?w=1200",
              }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <LinearGradient
              colors={["rgba(255,255,255,0.0)", "rgba(0,0,0,0.55)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroContent}>
              <Text style={styles.heroLabel}>SEU TREINO</Text>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {activePlan.title}
              </Text>
              <Text style={styles.heroSub}>
                {activePlan.items.length} exercícios
              </Text>
            </View>
          </View>
        ) : (
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
        )}

        {activePlan && activePlan.items.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
            <Text style={styles.sectionTitle}>EXERCÍCIOS DE HOJE</Text>
            <FlatList
              data={activePlan.items}
              scrollEnabled={false}
              keyExtractor={(item, idx) => `${item.exercise_id}-${idx}`}
              renderItem={({ item, index }) => {
                const ex = exMap[item.exercise_id];
                if (!ex) return null;
                return (
                  <Pressable
                    testID={`plan-item-${index}`}
                    onPress={() => router.push(`/exercise/${ex.id}`)}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Image
                      source={{ uri: ex.thumbnail_url ?? undefined }}
                      style={styles.rowThumb}
                      contentFit="cover"
                    />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {ex.title}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {item.sets}x{item.reps} · {ex.category}
                      </Text>
                    </View>
                    <Ionicons
                      name="play-circle"
                      size={28}
                      color={colors.brand}
                    />
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
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
  avatar: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  heroWrap: {
    marginHorizontal: spacing.lg,
    height: 220,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceSecondary,
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.lg,
    gap: 4,
  },
  heroLabel: { color: "#FFFFFF", fontSize: 12, letterSpacing: 3, fontWeight: "800" },
  heroTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  heroSub: { color: "#E0E0E0", fontSize: 14 },
  empty: {
    margin: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "700", marginTop: spacing.sm },
  emptySub: { color: colors.onSurfaceTertiary, fontSize: 14, textAlign: "center" },
  emptyCta: {
    marginTop: spacing.md,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  emptyCtaText: { color: colors.onSurface, fontWeight: "800" },
  sectionTitle: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  rowThumb: {
    width: 72,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceTertiary,
  },
  rowTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "600" },
  rowMeta: { color: colors.onSurfaceTertiary, fontSize: 12 },
});
