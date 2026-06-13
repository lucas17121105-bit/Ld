import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme/tokens";

export default function LoginScreen() {
  const { signIn, loading: authLoading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onPress = async () => {
    setErr(null);
    setBusy(true);
    try {
      await signIn();
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao entrar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container} testID="login-screen">
      <LinearGradient
        colors={["#BBDEFB", "#E3F2FD", "#FFFFFF"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>LD</Text>
          </View>
          <Text style={styles.brandText}>VÔLEI APP</Text>
        </View>

        <View style={styles.heroBox}>
          <Ionicons name="basketball" size={64} color={colors.onSurface} />
          <Text style={styles.headline}>
            Treine voleibol{"\n"}com método.
          </Text>
          <Text style={styles.sub}>
            Vídeos por técnica, treinos personalizados pelo seu professor e
            acompanhamento do progresso.
          </Text>
        </View>

        <Pressable
          testID="google-login-button"
          onPress={onPress}
          disabled={busy || authLoading}
          style={({ pressed }) => [
            styles.cta,
            pressed && { opacity: 0.85 },
            (busy || authLoading) && { opacity: 0.6 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.onSurface} />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color={colors.onSurface} />
              <Text style={styles.ctaText}>Entrar com Google</Text>
            </>
          )}
        </Pressable>

        {err ? (
          <Text style={styles.err} testID="login-error">
            {err}
          </Text>
        ) : null}

        <Text style={styles.legal}>
          Ao continuar você concorda com os Termos e a Política de Privacidade.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: {
    flex: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xxxl + spacing.lg,
    gap: spacing.lg,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  brandBadge: {
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  brandBadgeText: {
    color: colors.onSurface,
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 1,
  },
  brandText: {
    color: colors.onSurface,
    fontSize: 16,
    letterSpacing: 4,
    fontWeight: "800",
  },
  heroBox: {
    flex: 1,
    gap: spacing.lg,
    justifyContent: "center",
  },
  headline: {
    color: colors.onSurface,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "900",
  },
  sub: {
    color: colors.onSurfaceTertiary,
    fontSize: 15,
    lineHeight: 22,
  },
  cta: {
    marginTop: spacing.lg,
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
  ctaText: { color: colors.onSurface, fontWeight: "800", fontSize: 16 },
  err: { color: colors.error, textAlign: "center" },
  legal: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    textAlign: "center",
  },
});
