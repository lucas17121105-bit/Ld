import { Redirect, Slot, useRouter, useSegments } from "expo-router";
import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme/tokens";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "speedometer" as const, key: "" },
  { href: "/admin/students", label: "Alunos", icon: "people" as const, key: "students" },
  { href: "/admin/exercises", label: "Exercícios", icon: "film" as const, key: "exercises" },
  { href: "/admin/plans", label: "Treinos", icon: "clipboard" as const, key: "plans" },
];

export default function AdminLayout() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const segments = useSegments() as string[];
  const insets = useSafeAreaInsets();

  if (loading) return null;
  if (!user) return <Redirect href="/login" />;
  if (user.role !== "admin") return <Redirect href="/(tabs)" />;

  // segments e.g. ["admin"] or ["admin","students"]
  const current = segments[1] ?? "";

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.sidebar}>
        <View style={styles.brand}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>LD</Text>
          </View>
          <Text style={styles.brandText}>ADMIN</Text>
        </View>
        <ScrollView>
          {NAV.map((n) => {
            const active = n.key === current;
            return (
              <Pressable
                key={n.href}
                testID={`nav-${n.key || "dashboard"}`}
                onPress={() => router.push(n.href as any)}
                style={[styles.navItem, active && styles.navItemActive]}
              >
                <Ionicons
                  name={n.icon}
                  size={18}
                  color={active ? colors.onSurface : colors.onSurfaceTertiary}
                />
                <Text
                  style={[
                    styles.navLabel,
                    active && { color: colors.onSurface, fontWeight: "800" },
                  ]}
                >
                  {n.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          testID="admin-logout"
          onPress={handleLogout}
          style={styles.logout}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Sair</Text>
        </Pressable>
      </View>
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: colors.surface },
  sidebar: {
    width: 240,
    backgroundColor: colors.surfaceSecondary,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  brandBadge: {
    backgroundColor: colors.brand,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  brandBadgeText: {
    color: colors.onSurface,
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
  },
  brandText: {
    color: colors.onSurface,
    letterSpacing: 3,
    fontWeight: "800",
    fontSize: 14,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  navItemActive: { backgroundColor: colors.brandTertiary },
  navLabel: { color: colors.onSurfaceTertiary, fontSize: 14, fontWeight: "600" },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: { color: colors.error, fontWeight: "700" },
  content: { flex: 1, padding: spacing.xl },
});
