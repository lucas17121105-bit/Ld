/**
 * CelebrationModal — confetti animation + streak calendar grid.
 */
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing } from "@/src/theme/tokens";

type Streak = {
  id: string;
  user_id: string;
  completed_at: string;
  week_start: string;
};

const EMOJIS = ["🎉", "🏐", "✨", "⭐", "🏆", "💪", "🔥", "🥇"];

function ConfettiPiece({
  delay,
  x,
  emoji,
}: {
  delay: number;
  x: number;
  emoji: string;
}) {
  const y = useRef(new Animated.Value(-60)).current;
  const rot = useRef(new Animated.Value(0)).current;
  const screenH = Dimensions.get("window").height;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, {
        toValue: screenH + 60,
        duration: 3200 + Math.random() * 800,
        delay,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(rot, {
          toValue: 1,
          duration: 1400,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
    ]).start();
  }, [delay, rot, screenH, y]);

  return (
    <Animated.Text
      pointerEvents="none"
      style={[
        styles.piece,
        {
          left: x,
          transform: [
            { translateY: y },
            {
              rotate: rot.interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "360deg"],
              }),
            },
          ],
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

function weekKey(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
  return d.toISOString().slice(0, 10);
}

export default function CelebrationModal({
  visible,
  onClose,
  streaks,
}: {
  visible: boolean;
  onClose: () => void;
  streaks: Streak[];
}) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => ({
        x: Math.random() * (Dimensions.get("window").width - 30),
        delay: i * 80,
        emoji: EMOJIS[i % EMOJIS.length],
      })),
    [visible]
  );

  const weeks = useMemo(() => {
    const out: { label: string; key: string; done: boolean }[] = [];
    const today = new Date();
    const completedKeys = new Set(
      streaks.map((s) => weekKey(new Date(s.week_start)))
    );
    for (let i = 7; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i * 7);
      const k = weekKey(d);
      const monday = new Date(k + "T00:00:00");
      const label = monday.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      });
      out.push({ label, key: k, done: completedKeys.has(k) });
    }
    return out;
  }, [streaks]);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        {visible
          ? pieces.map((p, idx) => (
              <ConfettiPiece
                key={`${p.x}-${idx}`}
                x={p.x}
                delay={p.delay}
                emoji={p.emoji}
              />
            ))
          : null}
        <View style={styles.card} testID="celebration-modal">
          <View style={styles.trophy}>
            <Text style={{ fontSize: 56 }}>🏆</Text>
          </View>
          <Text style={styles.title}>Semana Concluída!</Text>
          <Text style={styles.sub}>
            Você terminou todos os treinos da semana. Continue assim!
          </Text>

          <Text style={styles.sectionLabel}>SEU STREAK</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calendarRow}
          >
            {weeks.map((w) => (
              <View
                key={w.key}
                style={[styles.weekChip, w.done && styles.weekChipDone]}
                testID={`week-${w.key}`}
              >
                {w.done ? (
                  <Ionicons name="checkmark" size={22} color="#fff" />
                ) : (
                  <View style={styles.weekChipEmpty} />
                )}
                <Text
                  style={[
                    styles.weekChipLabel,
                    w.done && { color: "#fff", fontWeight: "800" },
                  ]}
                >
                  {w.label}
                </Text>
              </View>
            ))}
          </ScrollView>

          <Text style={styles.streakCount}>
            🔥 {streaks.length} semana{streaks.length === 1 ? "" : "s"} no total
          </Text>

          <Pressable
            testID="celebration-close"
            onPress={onClose}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.ctaText}>Continuar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  piece: { position: "absolute", top: 0, fontSize: 28 },
  card: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.brand,
  },
  trophy: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.onSurface,
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  sub: {
    color: colors.onSurfaceTertiary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  sectionLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "800",
    marginTop: spacing.md,
    alignSelf: "flex-start",
  },
  calendarRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  weekChip: {
    width: 60,
    height: 76,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  weekChipDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  weekChipEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  weekChipLabel: { color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: "700" },
  streakCount: {
    marginTop: spacing.sm,
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "700",
  },
  cta: {
    marginTop: spacing.lg,
    alignSelf: "stretch",
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  ctaText: { color: colors.onSurface, fontWeight: "900", fontSize: 16 },
});
