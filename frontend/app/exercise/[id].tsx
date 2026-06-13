import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
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
import { WebView } from "react-native-webview";

import { api } from "@/src/lib/api";
import { colors, radius, spacing } from "@/src/theme/tokens";

type Exercise = {
  id: string;
  title: string;
  description: string;
  category: string;
  video_url?: string | null;
  video_base64?: string | null;
  thumbnail_url?: string | null;
  duration_seconds: number;
};

function youtubeIdFrom(url: string): string | null {
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function vimeoIdFrom(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function buildEmbedUrl(url: string): string | null {
  const yt = youtubeIdFrom(url);
  if (yt) return `https://www.youtube.com/embed/${yt}`;
  const vm = vimeoIdFrom(url);
  if (vm) return `https://player.vimeo.com/video/${vm}`;
  return null;
}

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ex, setEx] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api<Exercise>(`/exercises/${id}`);
      setEx(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const markDone = async () => {
    if (!ex) return;
    setMarking(true);
    try {
      await api("/progress", {
        method: "POST",
        body: JSON.stringify({ exercise_id: ex.id }),
      });
      setDone(true);
    } catch (e) {
      console.warn(e);
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }
  if (!ex) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.onSurface }}>Exercício não encontrado</Text>
      </View>
    );
  }

  const embed = ex.video_url ? buildEmbedUrl(ex.video_url) : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="exercise-detail">
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.iconBtn}
          testID="back-button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {ex.category.toUpperCase()}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl + 80 }}>
        <View style={styles.videoBox}>
          {embed ? (
            Platform.OS === "web" ? (
              // @ts-expect-error iframe is a DOM element only on web
              <iframe
                src={embed}
                style={{
                  width: "100%",
                  height: "100%",
                  border: 0,
                  borderRadius: 12,
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <WebView
                source={{ uri: embed }}
                style={{ flex: 1, backgroundColor: "#000" }}
                allowsFullscreenVideo
                javaScriptEnabled
              />
            )
          ) : (
            <Image
              source={{ uri: ex.thumbnail_url ?? undefined }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{ex.title}</Text>
          {ex.description ? (
            <Text style={styles.desc}>{ex.description}</Text>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          testID="mark-done-button"
          onPress={markDone}
          disabled={marking || done}
          style={({ pressed }) => [
            styles.markBtn,
            pressed && { opacity: 0.85 },
            done && { backgroundColor: colors.success, borderColor: colors.success },
          ]}
        >
          {marking ? (
            <ActivityIndicator color={colors.onSurface} />
          ) : (
            <>
              <Ionicons
                name={done ? "checkmark-circle" : "checkmark"}
                size={22}
                color={done ? "#fff" : colors.onSurface}
              />
              <Text
                style={[
                  styles.markBtnText,
                  done && { color: "#fff" },
                ]}
              >
                {done ? "Concluído!" : "Marcar como concluído"}
              </Text>
            </>
          )}
        </Pressable>
      </View>
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
  videoBox: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  body: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800" },
  desc: { color: colors.onSurfaceTertiary, fontSize: 15, lineHeight: 22 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  markBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  markBtnText: { color: colors.onSurface, fontWeight: "800", fontSize: 16 },
});
