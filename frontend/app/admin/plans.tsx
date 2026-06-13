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
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/src/lib/api";
import { colors, radius, spacing } from "@/src/theme/tokens";

type Student = { user_id: string; name: string; email: string };
type Exercise = { id: string; title: string; category: string };
type PlanItem = { exercise_id: string; sets: number; reps: number; notes: string };
type Plan = {
  id: string;
  student_id: string;
  title: string;
  description: string;
  items: PlanItem[];
  is_active: boolean;
  created_at?: string;
};

export default function AdminPlans() {
  const [students, setStudents] = useState<Student[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({
    student_id: "",
    title: "",
    description: "",
    is_active: true,
    items: [] as PlanItem[],
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [st, ex, pl] = await Promise.all([
        api<Student[]>("/students"),
        api<Exercise[]>("/exercises"),
        api<Plan[]>("/plans"),
      ]);
      setStudents(st);
      setExercises(ex);
      setPlans(pl);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const studentName = (id: string) =>
    students.find((s) => s.user_id === id)?.name ?? id;

  const openCreate = () => {
    setEditing(null);
    setForm({
      student_id: students[0]?.user_id ?? "",
      title: "",
      description: "",
      is_active: true,
      items: [],
    });
    setErr(null);
    setModal(true);
  };

  const openEdit = (p: Plan) => {
    setEditing(p);
    setForm({
      student_id: p.student_id,
      title: p.title,
      description: p.description ?? "",
      is_active: p.is_active,
      items: [...p.items],
    });
    setErr(null);
    setModal(true);
  };

  const addItem = (exercise_id: string) => {
    if (!exercise_id) return;
    if (form.items.find((i) => i.exercise_id === exercise_id)) return;
    setForm({
      ...form,
      items: [...form.items, { exercise_id, sets: 3, reps: 10, notes: "" }],
    });
  };

  const removeItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const updateItem = (idx: number, patch: Partial<PlanItem>) => {
    setForm({
      ...form,
      items: form.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    });
  };

  const save = async () => {
    setErr(null);
    if (!form.student_id) return setErr("Selecione um aluno");
    if (!form.title.trim()) return setErr("Título é obrigatório");
    if (form.items.length === 0) return setErr("Adicione ao menos 1 exercício");
    setSaving(true);
    try {
      const body = {
        student_id: form.student_id,
        title: form.title,
        description: form.description,
        is_active: form.is_active,
        items: form.items,
      };
      if (editing) {
        await api(`/plans/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await api("/plans", { method: "POST", body: JSON.stringify(body) });
      }
      setModal(false);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Plan) => {
    if (typeof window !== "undefined" && !window.confirm(`Excluir treino "${p.title}"?`)) return;
    try {
      await api(`/plans/${p.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <View style={{ flex: 1 }} testID="admin-plans">
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Treinos Personalizados</Text>
          <Text style={styles.sub}>Atribua planos de treino aos alunos.</Text>
        </View>
        <Pressable onPress={openCreate} style={styles.addBtn} testID="add-plan">
          <Ionicons name="add" size={18} color={colors.onSurface} />
          <Text style={styles.addText}>Novo treino</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : plans.length === 0 ? (
        <Text style={{ color: colors.onSurfaceTertiary, marginTop: spacing.xl }}>
          Nenhum treino criado ainda.
        </Text>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.md }}
          renderItem={({ item }) => {
            const created = item.created_at
              ? new Date(item.created_at).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : null;
            return (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.meta}>
                    Aluno: {studentName(item.student_id)} · {item.items.length} exercícios
                    {item.is_active ? " · ATIVO" : " · INATIVO"}
                  </Text>
                  {created ? (
                    <Text style={styles.dateMeta} testID={`plan-date-${item.id}`}>
                      Criado em {created}
                    </Text>
                  ) : null}
                </View>
                <Pressable onPress={() => openEdit(item)} style={styles.iconBtn} testID={`edit-plan-${item.id}`}>
                  <Ionicons name="pencil" size={16} color={colors.onSurface} />
                </Pressable>
                <Pressable onPress={() => remove(item)} style={styles.iconBtn} testID={`delete-plan-${item.id}`}>
                  <Ionicons name="trash" size={16} color={colors.error} />
                </Pressable>
              </View>
            );
          }}
        />
      )}

      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
              <Text style={styles.modalTitle}>
                {editing ? "Editar treino" : "Novo treino"}
              </Text>
              <Text style={styles.label}>Aluno</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  {students.map((s) => {
                    const active = s.user_id === form.student_id;
                    return (
                      <Pressable
                        key={s.user_id}
                        onPress={() => setForm({ ...form, student_id: s.user_id })}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && { color: colors.onSurface, fontWeight: "800" }]}>
                          {s.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <Text style={styles.label}>Título *</Text>
              <TextInput
                value={form.title}
                onChangeText={(v) => setForm({ ...form, title: v })}
                style={styles.input}
                placeholderTextColor={colors.onSurfaceTertiary}
                placeholder="Ex: Treino A — Saques e Manchete"
                testID="plan-title"
              />
              <Text style={styles.label}>Descrição</Text>
              <TextInput
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
                style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
                multiline
                placeholderTextColor={colors.onSurfaceTertiary}
              />

              <Text style={styles.label}>Adicionar exercício</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  {exercises.map((e) => (
                    <Pressable
                      key={e.id}
                      onPress={() => addItem(e.id)}
                      style={styles.chip}
                      testID={`add-ex-${e.id}`}
                    >
                      <Text style={styles.chipText}>
                        + {e.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text style={[styles.label, { marginTop: spacing.md }]}>
                Exercícios do plano ({form.items.length})
              </Text>
              {form.items.map((it, idx) => {
                const ex = exercises.find((e) => e.id === it.exercise_id);
                return (
                  <View key={`${it.exercise_id}-${idx}`} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.onSurface, fontWeight: "700" }}>
                        {ex?.title ?? it.exercise_id}
                      </Text>
                      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: 6 }}>
                        <TextInput
                          value={String(it.sets)}
                          onChangeText={(v) =>
                            updateItem(idx, { sets: Number(v.replace(/\D/g, "")) || 0 })
                          }
                          style={[styles.input, { width: 70 }]}
                          keyboardType="numeric"
                        />
                        <Text style={{ color: colors.onSurfaceTertiary, alignSelf: "center" }}>séries x</Text>
                        <TextInput
                          value={String(it.reps)}
                          onChangeText={(v) =>
                            updateItem(idx, { reps: Number(v.replace(/\D/g, "")) || 0 })
                          }
                          style={[styles.input, { width: 70 }]}
                          keyboardType="numeric"
                        />
                        <Text style={{ color: colors.onSurfaceTertiary, alignSelf: "center" }}>reps</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => removeItem(idx)} style={styles.iconBtn}>
                      <Ionicons name="trash" size={16} color={colors.error} />
                    </Pressable>
                  </View>
                );
              })}

              <Pressable
                onPress={() => setForm({ ...form, is_active: !form.is_active })}
                style={[styles.chip, form.is_active && styles.chipActive, { alignSelf: "flex-start" }]}
              >
                <Text style={[styles.chipText, form.is_active && { color: colors.onSurface, fontWeight: "800" }]}>
                  {form.is_active ? "✓ Ativo" : "Inativo"}
                </Text>
              </Pressable>

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
                  testID="save-plan"
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
  title: { color: colors.onSurface, fontWeight: "700", fontSize: 15 },
  meta: { color: colors.onSurfaceTertiary, fontSize: 12, marginTop: 4 },
  dateMeta: {
    color: colors.info,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
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
    maxWidth: 640,
    maxHeight: "90%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  label: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "700" },
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
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
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
