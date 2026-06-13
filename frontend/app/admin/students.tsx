import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";

import { api } from "@/src/lib/api";
import { colors, radius, spacing } from "@/src/theme/tokens";

type Student = {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  created_at: string;
};

export default function AdminStudents() {
  const [items, setItems] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await api<Student[]>("/students");
        setItems(list);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View testID="admin-students" style={{ flex: 1 }}>
      <Text style={styles.h1}>Alunos</Text>
      <Text style={styles.sub}>
        Todos os alunos que já entraram no app aparecem aqui.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Nenhum aluno ainda. Compartilhe o app!</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(s) => s.user_id}
          contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.md }}
          renderItem={({ item }) => (
            <View style={styles.row} testID={`student-${item.user_id}`}>
              {item.picture ? (
                <Image source={{ uri: item.picture }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.brandTertiary }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.email}>{item.email}</Text>
              </View>
              <Text style={styles.id}>{item.user_id}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.onSurface, fontSize: 28, fontWeight: "800" },
  sub: { color: colors.onSurfaceTertiary, marginTop: 6, marginBottom: spacing.lg },
  empty: { color: colors.onSurfaceTertiary, marginTop: spacing.xl },
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
  avatar: { width: 40, height: 40, borderRadius: radius.pill },
  name: { color: colors.onSurface, fontWeight: "700" },
  email: { color: colors.onSurfaceTertiary, fontSize: 12 },
  id: { color: colors.onSurfaceTertiary, fontSize: 11 },
});
