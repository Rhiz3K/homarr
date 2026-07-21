import { createContext, useContext } from "react";

const HERMES_FONT_SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const HERMES_FONT_MONO = 'ui-monospace, "SFMono-Regular", "Cascadia Mono", Menlo, Consolas, monospace';

export interface HermesTheme {
  background: string;
  surface: string;
  surfaceRaised: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderStrong: string;
  success: string;
  warning: string;
  error: string;
  glow: string;
  fontSans: string;
  fontMono: string;
}

export const HERMES_BRAND_THEME: HermesTheme = {
  background: "#041c1c",
  surface: "color-mix(in srgb, #ffe6cb 4%, #041c1c)",
  surfaceRaised: "color-mix(in srgb, #ffe6cb 7%, #041c1c)",
  textPrimary: "#ffe6cb",
  textSecondary: "rgba(255, 230, 203, 0.8)",
  textTertiary: "rgba(255, 230, 203, 0.7)",
  border: "rgba(255, 230, 203, 0.15)",
  borderStrong: "rgba(255, 230, 203, 0.24)",
  success: "#34d399",
  warning: "#ffbd38",
  error: "#fb2c36",
  glow: "rgba(255, 189, 56, 0.18)",
  fontSans: HERMES_FONT_SANS,
  fontMono: HERMES_FONT_MONO,
};

export const HERMES_NEUTRAL_THEME: HermesTheme = {
  background: "var(--mantine-color-body)",
  surface: "var(--mantine-color-default)",
  surfaceRaised: "var(--mantine-color-default-hover)",
  textPrimary: "var(--mantine-color-text)",
  textSecondary: "var(--mantine-color-dimmed)",
  textTertiary: "var(--mantine-color-dimmed)",
  border: "var(--mantine-color-default-border)",
  borderStrong: "var(--mantine-color-default-border)",
  success: "var(--mantine-color-green-6)",
  warning: "var(--mantine-color-yellow-6)",
  error: "var(--mantine-color-red-6)",
  glow: "transparent",
  fontSans: HERMES_FONT_SANS,
  fontMono: HERMES_FONT_MONO,
};

export const HermesThemeContext = createContext<HermesTheme>(HERMES_BRAND_THEME);

export const useHermesTheme = () => useContext(HermesThemeContext);

export const HERMES_CHROME_TEXT_STYLE = {
  fontFamily: HERMES_FONT_SANS,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} as const;

export const HERMES_TECHNICAL_TEXT_STYLE = {
  fontFamily: HERMES_FONT_MONO,
  fontVariantNumeric: "tabular-nums",
} as const;
