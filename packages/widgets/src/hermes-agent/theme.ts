export const HERMES_THEME = {
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
  fontSans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontMono: 'ui-monospace, "SFMono-Regular", "Cascadia Mono", Menlo, Consolas, monospace',
} as const;

export const HERMES_CHROME_TEXT_STYLE = {
  fontFamily: HERMES_THEME.fontSans,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} as const;

export const HERMES_TECHNICAL_TEXT_STYLE = {
  fontFamily: HERMES_THEME.fontMono,
  fontVariantNumeric: "tabular-nums",
} as const;
