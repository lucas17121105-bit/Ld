import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

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

type Category = { key: string; label: string };

const empty = {
  title: "",
  description: "",
  category: "saque",
  video_url: "",
  thumbnail_url: "",
  duration_seconds: "0",
};

export default function AdminExercises() {
  const [items, setItems] = useState<Exercise[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [ex, c] = await Promise.all([
        api<Exercise[]>("/exercises"),
        api<Category[]>("/categories"),
      ]);
      setItems(ex);
      setCats(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty });
    setErr(null);
    setModal(true);
  };

  const openEdit = (ex: Exercise) => {
    setEditing(ex);
    setForm({
      title: ex.title,
      description: ex.description ?? "",
      category: ex.category,
      video_url: ex.video_url ?? "",
      thumbnail_url: ex.thumbnail_url ?? "",
      duration_seconds: String(ex.duration_seconds ?? 0),
    });
    setErr(null);
    setModal(true);
  };

  const save = async () => {
    setErr(null);
    if (!form.title.trim()) {
      setErr("Título é obrigatório");
      return;
    }
    if (!form.video_url.trim()) {
      setErr("Link de vídeo (YouTube/Vimeo) é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: form.title,
        description: form.description,
        category: form.category,
        video_url: form.video_url,
        thumbnail_url: form.thumbnail_url || null,
        duration_seconds: Number(form.duration_seconds) || 0,
      };
      if (editing) {
        await api(`/exercises/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await api("/exercises", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setModal(false);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (ex: Exercise) => {
    if (typeof window !== "undefined" && !window.confirm(`Excluir "${ex.title}"?`)) return;
    try {
      await api(`/exercises/${ex.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <View style={{ flex: 1 }} testID="admin-exercises">
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Exercícios</Text>
          <Text style={styles.sub}>Biblioteca de vídeos por categoria.</Text>
        </View>
        <Pressable onPress={openCreate} style={styles.addBtn} testID="add-exercise">
          <Ionicons name="add" size={18} color={colors.onSurface} />
          <Text style={styles.addText}>Novo exercício</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.md }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Image
                source={{ uri: item.thumbnail_url ?? undefined }}
                style={styles.thumb}
                contentFit="cover"
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>{item.category}</Text>
                <Text style={styles.url} numberOfLines={1}>
                  {item.video_url}
                </Text>
              </View>
              <Pressable onPress={() => openEdit(item)} style={styles.iconBtn} testID={`edit-${item.id}`}>
                <Ionicons name="pencil" size={16} color={colors.onSurface} />
              </Pressable>
              <Pressable onPress={() => remove(item)} style={styles.iconBtn} testID={`delete-${item.id}`}>
                <Ionicons name="trash" size={16} color={colors.error} />
              </Pressable>
            </View>
          )}
        />
      )}

      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView contentContainerStyle={{ gap: spacing.md, padding: spacing.lg }}>
              <Text style={styles.modalTitle}>
                {editing ? "Editar exercício" : "Novo exercício"}
              </Text>
              <Field
                label="Título *"
                value={form.title}
                onChangeText={(v) => setForm({ ...form, title: v })}
                testID="field-title"
              />
              <Field
                label="Descrição"
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
                multiline
              />
              <Text style={styles.label}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  {cats.map((c) => {
                    const active = c.key === form.category;
                    return (
                      <Pressable
                        key={c.key}
                        onPress={() => setForm({ ...form, category: c.key })}
                        style={[styles.chip, active && styles.chipActive]}
                        testID={`cat-${c.key}`}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            active && { color: colors.onSurface, fontWeight: "800" },
                          ]}
                        >
                          {c.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              <Field
                label="Link do vídeo (YouTube/Vimeo) *"
                value={form.video_url}
                onChangeText={(v) => setForm({ ...form, video_url: v })}
                testID="field-video-url"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <Field
                label="Thumbnail (URL)"
                value={form.thumbnail_url}
                onChangeText={(v) => setForm({ ...form, thumbnail_url: v })}
                placeholder="https://..."
              />
              <Field
                label="Duração (segundos)"
                value={form.duration_seconds}
                onChangeText={(v) =>
                  setForm({ ...form, duration_seconds: v.replace(/\D/g, "") })
                }
                keyboardType="numeric"
              />
              {err ? <Text style={{ color: colors.error }}>{err}</Text> : null}
              <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
                <Pressable
                  style={[styles.btn, { backgroundColor: colors.surfaceTertiary }]}
                  onPress={() => setModal(false)}
                >
                  <Text style={styles.btnText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={save}
                  disabled={saving}
                  testID="save-exercise"
                >
                  {saving ? (
                    <ActivityIndicator color={colors.onSurface} />
                  ) : (
                    <Text style={[styles.btnText, { fontWeight: "800" }]}>Salvar</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.onSurfaceTertiary}
        style={[
          styles.input,
          props.multiline && { minHeight: 80, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  h1: { color: colors.onSurface, fontSize: 28, fontWeight: "800" },
  sub: { color: colors.onSurfaceTertiary, marginTop: 6 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  addText: { color: colors.onSurface, fontWeight: "800" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  thumb: {
    width: 96,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceTertiary,
  },
  title: { color: colors.onSurface, fontWeight: "700", fontSize: 15 },
  meta: { color: colors.brand, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  url: { color: colors.onSurfaceTertiary, fontSize: 12 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "90%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  label: { color: colors.onSurfaceTertiary, fontSize: 12, marginBottom: 6, fontWeight: "700" },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brand },
  chipText: { color: colors.onSurfaceTertiary, fontSize: 12 },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    backgroundColor: colors.brand,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  btnText: { color: colors.onSurface, fontWeight: "700" },
});
