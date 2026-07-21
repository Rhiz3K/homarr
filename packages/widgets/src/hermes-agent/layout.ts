import { HERMES_THEME } from "./theme";

export type LayoutMode = "micro" | "strip" | "tall" | "standard" | "showcase";

export function getLayoutMode(width: number, height: number): LayoutMode {
  if (width < 130 && height < 130) return "micro";
  if (height < 130) return "strip";
  if (width < 150) return "tall";
  if (width >= 380 && height >= 190) return "showcase";
  return "standard";
}

export function getMetricColumns(mode: LayoutMode, width: number) {
  switch (mode) {
    case "micro":
      return 2;
    case "strip":
      return width >= 300 ? 4 : 3;
    case "tall":
      return 1;
    case "showcase":
      return 4;
    case "standard":
      return width >= 260 ? 4 : 2;
  }
}

export function getVisibleMetricIds(mode: LayoutMode) {
  switch (mode) {
    case "micro":
      return ["version", "update", "jobs", "skills"];
    case "strip":
    case "tall":
      return ["version", "update", "jobs", "skills", "platforms", "toolsets"];
    case "standard":
    case "showcase":
      return ["version", "update", "jobs", "skills", "platforms", "toolsets", "agents", "sessions"];
  }
}

export function getContentGap(mode: LayoutMode) {
  switch (mode) {
    case "micro":
    case "strip":
    case "tall":
      return 3;
    case "standard":
      return 5;
    case "showcase":
      return 8;
  }
}

export function getMetricSpacing(mode: LayoutMode) {
  return mode === "showcase" ? 6 : mode === "standard" ? 4 : 2;
}

export function getLogoSize(mode: LayoutMode) {
  switch (mode) {
    case "micro":
      return 14;
    case "strip":
    case "tall":
      return 16;
    case "standard":
      return 22;
    case "showcase":
      return 28;
  }
}

export function getTitleSize(mode: LayoutMode) {
  switch (mode) {
    case "micro":
    case "strip":
    case "tall":
      return "xs";
    case "standard":
      return "sm";
    case "showcase":
      return "md";
  }
}

export function getCompactVersionValue(version: string, isDense: boolean, isMicro: boolean) {
  if (!isDense) return version;

  const segments = version.replace(/^v/, "").split(".");
  if (segments.length >= 2 && segments[0] && segments[1]) {
    if (isMicro && segments[0].length === 4) {
      return `v${segments[0].slice(2)}.${segments[1]}`;
    }

    return `v${segments[0]}.${segments[1]}`;
  }

  return version;
}

export function getCardStyle() {
  return {
    background: `radial-gradient(circle at top right, ${HERMES_THEME.glow}, transparent 42%), ${HERMES_THEME.background}`,
    border: `1px solid ${HERMES_THEME.borderStrong}`,
    boxShadow: `inset 0 1px 0 ${HERMES_THEME.border}, 0 0 20px rgba(4, 28, 28, 0.2)`,
    color: HERMES_THEME.textPrimary,
    fontFamily: HERMES_THEME.fontSans,
    overflow: "hidden",
  };
}

export function getContentStyle(mode: LayoutMode) {
  if (mode === "standard" || mode === "showcase") {
    return { overflow: "hidden" };
  }

  return {
    background: HERMES_THEME.surface,
    borderLeft: `2px solid ${HERMES_THEME.borderStrong}`,
    borderRadius: 8,
    boxShadow: `inset 0 0 0 1px ${HERMES_THEME.border}`,
    overflow: "hidden",
    paddingLeft: 3,
  };
}
