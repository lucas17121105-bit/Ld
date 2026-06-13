/**
 * Design tokens — LD vôlei app
 * Theme: light blue background with black text.
 */
export const colors = {
  surface: "#E3F2FD",          // light blue background
  onSurface: "#000000",        // black text
  surfaceSecondary: "#FFFFFF", // white cards
  onSurfaceSecondary: "#111111",
  surfaceTertiary: "#BBDEFB",  // slightly stronger blue tint
  onSurfaceTertiary: "#555555",
  surfaceInverse: "#0D47A1",
  onSurfaceInverse: "#FFFFFF",
  brand: "#4FC3F7",            // light blue CTA — works with black text
  brandPrimary: "#4FC3F7",
  onBrandPrimary: "#000000",
  brandSecondary: "#29B6F6",
  onBrandSecondary: "#000000",
  brandTertiary: "#B3E5FC",
  onBrandTertiary: "#000000",
  success: "#2E7D32",
  onSuccess: "#FFFFFF",
  warning: "#F57C00",
  onWarning: "#000000",
  error: "#C62828",
  onError: "#FFFFFF",
  info: "#1976D2",
  border: "#90CAF9",
  borderStrong: "#64B5F6",
  divider: "#BBDEFB",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export const font = {
  display: "System" as const,
  body: "System" as const,
};
