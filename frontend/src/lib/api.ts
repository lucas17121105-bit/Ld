/**
 * Tiny API client. Adds Authorization header automatically.
 */
import { tokenStorage } from "./tokenStorage";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";
export const API_BASE = `${BACKEND}/api`;

export const TOKEN_KEY = "voleipro_session_token";

export async function api<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await tokenStorage.get(TOKEN_KEY);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch {}
    if (res.status === 401) await tokenStorage.remove(TOKEN_KEY);
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
