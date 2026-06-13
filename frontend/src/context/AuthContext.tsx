/**
 * AuthContext — Emergent Google Auth, cross-platform.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import { api, TOKEN_KEY } from "../lib/api";
import { tokenStorage } from "../lib/tokenStorage";

export type User = {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  role: "student" | "admin";
};

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

const EMERGENT_AUTH_URL = "https://auth.emergentagent.com/";

function extractSessionId(url: string | null): string | null {
  if (!url) return null;
  try {
    // Look in hash fragment first
    const hashIdx = url.indexOf("#");
    if (hashIdx !== -1) {
      const hash = url.substring(hashIdx + 1);
      const params = new URLSearchParams(hash);
      const sid = params.get("session_id");
      if (sid) return sid;
    }
    // Then query string
    const qIdx = url.indexOf("?");
    if (qIdx !== -1) {
      const qs = url.substring(qIdx + 1).split("#")[0];
      const params = new URLSearchParams(qs);
      const sid = params.get("session_id");
      if (sid) return sid;
    }
  } catch {}
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const exchangeSessionId = useCallback(async (sessionId: string) => {
    const res = await api<{ session_token: string; user: User }>(
      "/auth/google",
      {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId }),
      }
    );
    await tokenStorage.set(TOKEN_KEY, res.session_token);
    setUser(res.user);
    return res.user;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await api<User>("/auth/me");
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  // On mount: check URL (web) and existing token
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          const sid =
            extractSessionId(window.location.hash ? `#${window.location.hash.replace(/^#/, "")}` : null) ||
            extractSessionId(window.location.search);
          if (sid) {
            try {
              await exchangeSessionId(sid);
            } catch (e) {
              console.error("Auth exchange failed", e);
            }
            // Clean URL
            window.history.replaceState(
              null,
              "",
              window.location.pathname
            );
            setLoading(false);
            return;
          }
        }

        // Mobile cold start
        if (Platform.OS !== "web") {
          const initial = await Linking.getInitialURL();
          const sid = extractSessionId(initial);
          if (sid) {
            try {
              await exchangeSessionId(sid);
            } catch (e) {
              console.error("Mobile cold-start exchange failed", e);
            }
            setLoading(false);
            return;
          }
        }

        // Check existing token
        const token = await tokenStorage.get(TOKEN_KEY);
        if (token) {
          await refresh();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [exchangeSessionId, refresh]);

  // Mobile hot deep link
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Linking.addEventListener("url", async ({ url }) => {
      const sid = extractSessionId(url);
      if (sid) {
        try {
          await exchangeSessionId(sid);
        } catch (e) {
          console.error("Deep link auth failed", e);
        }
      }
    });
    return () => sub.remove();
  }, [exchangeSessionId]);

  const signIn = useCallback(async () => {
    if (Platform.OS === "web") {
      const redirectUrl = `${window.location.origin}/`;
      window.location.href = `${EMERGENT_AUTH_URL}?redirect=${encodeURIComponent(
        redirectUrl
      )}`;
      return;
    }
    const redirectUrl = Linking.createURL("auth");
    const authUrl = `${EMERGENT_AUTH_URL}?redirect=${encodeURIComponent(
      redirectUrl
    )}`;
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    if (result.type === "success") {
      const sid = extractSessionId(result.url);
      if (sid) {
        await exchangeSessionId(sid);
      }
    }
  }, [exchangeSessionId]);

  const signOut = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    await tokenStorage.remove(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, signIn, signOut, refresh }),
    [user, loading, signIn, signOut, refresh]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
