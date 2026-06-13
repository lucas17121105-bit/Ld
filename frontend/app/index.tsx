import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";

import { useAuth } from "@/src/context/AuthContext";
import { colors } from "@/src/theme/tokens";

export default function Index() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // no-op: render handles routing
  }, [user, loading]);

  if (loading) {
    return (
      <View style={styles.center} testID="root-loading">
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (user.role === "admin") return <Redirect href="/admin" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
