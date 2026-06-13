import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme/tokens";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="profile-screen">
      <Text style={styles.title}>Perfil</Text>
      <View style={styles.card}>
        {user?.picture ? (
          <Image source={{ uri: user.picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={36} color={colors.onSurface} />
          </View>
        )}
        <Text style={styles.name} numberOfLines={1}>
          {user?.name}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {user?.email}
        </Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user?.role === "admin" ? "ADMINISTRADOR" : "ALUNO"}
          </Text>
        </View>
      </View>

      <Pressable
        testID="logout-button"
        onPress={handleLogout}
        style={({ pressed }) => [styles.logout, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.logoutText}>Sair</Text>
      </Pressable>
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
  card: {
    margin: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
  },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  name: {
    color: colors.onSurface,
    fontSize: 20,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  email: { color: colors.onSurfaceTertiary, fontSize: 14 },
  roleBadge: {
    marginTop: spacing.md,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  roleText: {
    color: colors.brand,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "700",
  },
  logout: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: "700" },
});
