import type { ReactNode } from "react";
import { Anchor, Group, Stack, Text } from "@mantine/core";

import type { LayoutMode } from "./layout";
import { HERMES_CHROME_TEXT_STYLE, HERMES_TECHNICAL_TEXT_STYLE, HERMES_THEME } from "./theme";

export interface MetricDefinition {
  id: string;
  icon: ReactNode;
  label: string;
  value: string | number;
  title?: string;
  detail?: string;
  color?: string;
  href?: string;
}

interface MetricTileProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  title?: string;
  detail?: string;
  color?: string;
  href?: string;
  mode: LayoutMode;
  hideDetail: boolean;
}

export function MetricTile({ icon, label, value, title, detail, color, href, mode, hideDetail }: MetricTileProps) {
  const valueTitle = `${label}: ${title ?? value}${detail && !hideDetail ? ` ${detail}` : ""}`;
  const isChip = mode === "micro" || mode === "strip" || mode === "tall" || (mode === "standard" && hideDetail);
  const isDense = mode !== "showcase";

  if (isChip) {
    return (
      <Group
        gap={mode === "micro" ? 0 : 1}
        wrap="nowrap"
        p={1}
        miw={0}
        style={{
          background: HERMES_THEME.surface,
          border: `1px solid ${HERMES_THEME.border}`,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <Text c={HERMES_THEME.textTertiary} lh={1} style={{ display: "flex", flexShrink: 0 }}>
          {icon}
        </Text>
        <MetricValue href={href} value={value} title={valueTitle} color={color} fontSize="xs" />
      </Group>
    );
  }

  return (
    <Stack
      gap={0}
      p={isDense ? 3 : 5}
      style={{
        border: `1px solid ${HERMES_THEME.border}`,
        background: HERMES_THEME.surface,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <Group gap={isDense ? 2 : 4} wrap="nowrap" miw={0}>
        <Text c={HERMES_THEME.textTertiary} lh={1} style={{ display: "flex", flexShrink: 0 }}>
          {icon}
        </Text>
        <Text
          size="xs"
          c={HERMES_THEME.textPrimary}
          lineClamp={1}
          style={{ ...HERMES_CHROME_TEXT_STYLE, letterSpacing: "0.04em", minWidth: 0 }}
        >
          {label}
        </Text>
      </Group>
      <Group gap={isDense ? 2 : 4} wrap="nowrap" miw={0}>
        <MetricValue href={href} value={value} title={valueTitle} color={color} fontSize={isDense ? "xs" : "sm"} />
        {detail && !hideDetail && (
          <Text size="xs" c={HERMES_THEME.textTertiary} lineClamp={1}>
            {detail}
          </Text>
        )}
      </Group>
    </Stack>
  );
}

interface MetricValueProps {
  href?: string;
  value: string | number;
  title: string;
  color?: string;
  fontSize: string;
}

function MetricValue({ href, value, title, color, fontSize }: MetricValueProps) {
  if (!href) {
    return (
      <Text
        fz={fontSize}
        fw={700}
        c={color ?? "inherit"}
        lineClamp={1}
        title={title}
        style={HERMES_TECHNICAL_TEXT_STYLE}
      >
        {value}
      </Text>
    );
  }

  return (
    <Anchor
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      fz={fontSize}
      fw={700}
      c={color ?? "inherit"}
      underline="never"
      lineClamp={1}
      title={title}
      style={HERMES_TECHNICAL_TEXT_STYLE}
    >
      {value}
    </Anchor>
  );
}
