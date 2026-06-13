import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

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
type Category = { key: string; label: string };

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string>("all");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, ex] = await Promise.all([
        api<Category[]>("/categories"),
        api<Exercise[]>(
          `/exercises${selected !== "all" ? `?category=${selected}` : ""}`
        ),
      ]);
      setCategories(cats);
      setExercises(ex);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    load();
  }, [load]);

  const chips = useMemo(
    () => [{ key: "all", label: "Todos" }, ...categories],
    [categories]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="library-screen">
      <View style={styles.headerWrap}>
        <Text style={styles.title}>Biblioteca</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {chips.map((c) => {
            const active = c.key === selected;
            return (
              <Pressable
                key={c.key}
                testID={`chip-${c.key}`}
                onPress={() => setSelected(c.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : exercises.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="film-outline" size={42} color={colors.onSurfaceTertiary} />
          <Text style={styles.emptyText}>Nenhum exercício encontrado.</Text>
        </View>
      ) : (
        <FlatList
          data={exercises}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ paddingBottom: spacing.xxxl, gap: spacing.md }}
          renderItem={({ item }) => (
            <Pressable
              testID={`exercise-card-${item.id}`}
              onPress={() => router.push(`/exercise/${item.id}`)}
              style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Image
                source={{ uri: item.thumbnail_url ?? undefined }}
                style={styles.cardThumb}
                contentFit="cover"
              />
              <View style={styles.playOverlay}>
                <Ionicons name="play-circle" size={36} color="#fff" />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardCat}>{item.category.toUpperCase()}</Text>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  headerWrap: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: {
    paddingHorizontal: spacing.lg,
    color: colors.onSurface,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  chipsRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.brandTertiary,
    borderColor: colors.brand,
  },
  chipText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: colors.brand },
  card: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  cardThumb: { width: "100%", aspectRatio: 16 / 10, backgroundColor: colors.surfaceTertiary },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { padding: spacing.md, gap: 4 },
  cardCat: { color: colors.brand, fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  cardTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "700", lineHeight: 18 },
  empty: { alignItems: "center", gap: spacing.md, marginTop: spacing.xxxl, paddingHorizontal: spacing.lg },
  emptyText: { color: colors.onSurfaceTertiary, fontSize: 14, textAlign: "center" },
});
