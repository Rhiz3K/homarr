import type { ReactNode } from "react";
import { Anchor, Avatar, Badge, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import {
  IconActivity,
  IconCalendarTime,
  IconGitCommit,
  IconMessageCircle,
  IconPackage,
  IconPlugConnected,
  IconSparkles,
  IconTools,
} from "@tabler/icons-react";

import { getIconUrl } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";

import type { HermesAgentInstance } from "./types";
import { getJobSummary, getStatusColor } from "./utils";

const HERMES_COLORS = {
  border: "#CD7F32",
  dim: "#8B8682",
  label: "#4dd0e1",
  ok: "#4caf50",
  surface: "#1a1a2e",
  title: "#FFD700",
  warn: "#ffa726",
  error: "#ef5350",
} as const;

type LayoutMode = "micro" | "strip" | "tall" | "standard" | "showcase";

interface MetricDefinition {
  id: string;
  icon: ReactNode;
  label: string;
  value: string | number;
  title?: string;
  detail?: string;
  color?: string;
  href: string;
}

interface HermesAgentInstanceCardProps {
  instance: HermesAgentInstance;
  width: number;
  height: number;
  isNarrow: boolean;
  isShort: boolean;
  isTiny: boolean;
}

export function HermesAgentInstanceCard({
  instance,
  width,
  height,
  isNarrow,
  isShort,
  isTiny,
}: HermesAgentInstanceCardProps) {
  const t = useScopedI18n("widget.hermesAgent");
  const { overview } = instance;
  const dashboardUrl = instance.integrationUrl.replace(/\/+$/, "");
  const dashboardRoutes = {
    config: getDashboardUrl(dashboardUrl, "/config"),
    cron: getDashboardUrl(dashboardUrl, "/cron"),
    profiles: getDashboardUrl(dashboardUrl, "/profiles"),
    sessions: getDashboardUrl(dashboardUrl, "/sessions"),
    skills: getDashboardUrl(dashboardUrl, "/skills"),
  };
  const status = overview.dashboardStatus;
  const gatewayState = status?.gateway_state ?? overview.health.gateway_state ?? overview.health.status;
  const platformEntries = Object.entries(status?.gateway_platforms ?? overview.health.platforms);
  const connectedPlatforms = platformEntries.filter(([, platform]) => platform.state === "connected").length;
  const enabledToolsets = overview.toolsets.filter((toolset) => toolset.enabled === true).length;
  const enabledSkills = overview.skills.filter((skill) => skill.enabled !== false).length;
  const activeSessions = status?.active_sessions ?? overview.sessions.length;
  const jobSummary = getJobSummary(overview.jobs);
  const version = status?.version ?? overview.capabilities.model ?? overview.models[0]?.id ?? t("unknown");
  const release = overview.update?.hasNewRelease
    ? overview.update.latestReleaseTag
    : status?.release_date
      ? `v${status.release_date}`
      : t("unknown");
  const commitsBehind = overview.update?.commitsBehind;
  const dense = isTiny || isShort;
  const layoutMode = getLayoutMode(width, height);
  const isMicroMetricMode = layoutMode === "micro" || layoutMode === "strip" || layoutMode === "tall";
  const compactRelease = isMicroMetricMode || (layoutMode === "standard" && width < 380);
  const metricColumns = getMetricColumns(layoutMode, width);
  const iconSize =
    layoutMode === "micro" ? 7 : isMicroMetricMode ? 8 : dense ? 11 : layoutMode === "showcase" ? 15 : 13;
  const releaseValue = getCompactReleaseValue(release, dense || compactRelease, compactRelease);
  const releaseColor = overview.update
    ? overview.update.hasNewRelease
      ? HERMES_COLORS.warn
      : HERMES_COLORS.ok
    : HERMES_COLORS.dim;
  const commitsColor =
    commitsBehind === null || commitsBehind === undefined
      ? HERMES_COLORS.dim
      : commitsBehind > 0
        ? HERMES_COLORS.warn
        : HERMES_COLORS.ok;
  const jobsColor =
    jobSummary.total === 0 ? HERMES_COLORS.dim : jobSummary.failed > 0 ? HERMES_COLORS.error : HERMES_COLORS.ok;
  const skillsColor = getRatioColor(enabledSkills, overview.skills.length);
  const platformsColor = getRatioColor(connectedPlatforms, platformEntries.length);
  const toolsetsColor = getRatioColor(enabledToolsets, overview.toolsets.length);
  const activeAgentsColor = getNeutralCountColor(overview.health.active_agents);
  const activeSessionsColor = getNeutralCountColor(activeSessions);
  const skillsValue =
    overview.skills.length > 0
      ? isMicroMetricMode && enabledSkills === overview.skills.length
        ? enabledSkills
        : `${enabledSkills}/${overview.skills.length}`
      : t("unknownShort");
  const statusLabel =
    isNarrow || layoutMode === "micro"
      ? getCompactStatusLabel(gatewayState ?? t("unknown"))
      : (gatewayState ?? t("unknown"));
  const titleLabel = layoutMode === "micro" || isNarrow ? "H" : instance.integrationName;
  const showVersion = layoutMode !== "micro" && !isNarrow;
  const showCardShell = layoutMode === "standard" || layoutMode === "showcase";
  const visibleMetrics = getVisibleMetrics(layoutMode, [
    {
      id: "release",
      icon: <IconPackage size={iconSize} />,
      label: t("summary.release"),
      value: releaseValue,
      title: release,
      color: releaseColor,
      href: dashboardRoutes.config,
    },
    {
      id: "commits",
      icon: <IconGitCommit size={iconSize} />,
      label: t("summary.commits"),
      value: commitsBehind ?? t("unknownShort"),
      color: commitsColor,
      href: dashboardRoutes.config,
    },
    {
      id: "jobs",
      icon: <IconCalendarTime size={iconSize} />,
      label: t("summary.jobs"),
      value: `${jobSummary.active}/${jobSummary.total}`,
      detail: jobSummary.failed > 0 ? t("jobs.failed", { count: `${jobSummary.failed}` }) : t("jobs.ok"),
      color: jobsColor,
      href: dashboardRoutes.cron,
    },
    {
      id: "skills",
      icon: <IconSparkles size={iconSize} />,
      label: t("summary.skills"),
      value: skillsValue,
      title: overview.skills.length > 0 ? `${enabledSkills}/${overview.skills.length}` : t("unknownShort"),
      color: skillsColor,
      href: dashboardRoutes.skills,
    },
    {
      id: "platforms",
      icon: <IconPlugConnected size={iconSize} />,
      label: t("summary.platforms"),
      value: `${connectedPlatforms}/${platformEntries.length}`,
      color: platformsColor,
      href: dashboardRoutes.sessions,
    },
    {
      id: "toolsets",
      icon: <IconTools size={iconSize} />,
      label: t("summary.toolsets"),
      value: `${enabledToolsets}/${overview.toolsets.length}`,
      color: toolsetsColor,
      href: dashboardRoutes.skills,
    },
    {
      id: "agents",
      icon: <IconActivity size={iconSize} />,
      label: t("summary.activeAgents"),
      value: overview.health.active_agents,
      color: activeAgentsColor,
      href: dashboardRoutes.profiles,
    },
    {
      id: "sessions",
      icon: <IconMessageCircle size={iconSize} />,
      label: t("summary.sessions"),
      value: activeSessions,
      color: activeSessionsColor,
      href: dashboardRoutes.sessions,
    },
  ]);

  const content = (
    <Stack
      gap={getContentGap(layoutMode)}
      justify={layoutMode === "showcase" ? "center" : undefined}
      style={getContentStyle(layoutMode)}
    >
      <Group justify="space-between" wrap="nowrap" gap={dense ? 4 : "xs"}>
        <Group gap={isMicroMetricMode ? 4 : "xs"} wrap="nowrap" miw={0}>
          <Avatar src={getIconUrl("hermesAgent")} alt="Hermes Agent" size={getLogoSize(layoutMode)} radius="sm" />
          <Stack gap={0} miw={0}>
            <Anchor
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              fz={getTitleSize(layoutMode)}
              fw={700}
              c={HERMES_COLORS.title}
              underline="never"
              lineClamp={1}
              title={`${instance.integrationName} ${t("meta.version", { version })}`}
            >
              {titleLabel}
            </Anchor>
            {showVersion && (
              <Text fz={dense ? "10px" : "xs"} c={HERMES_COLORS.dim} lineClamp={1}>
                {t("meta.version", { version })}
              </Text>
            )}
          </Stack>
        </Group>
        <Badge
          variant={isNarrow ? "light" : "dot"}
          color={getStatusColor(gatewayState)}
          size={dense ? "xs" : "sm"}
          maw={isNarrow ? 44 : 110}
        >
          {statusLabel}
        </Badge>
      </Group>

      <SimpleGrid
        cols={metricColumns}
        spacing={getMetricSpacing(layoutMode)}
        verticalSpacing={getMetricSpacing(layoutMode)}
      >
        {visibleMetrics.map((metric) => (
          <MetricTile
            key={metric.id}
            icon={metric.icon}
            label={metric.label}
            value={metric.value}
            title={metric.title}
            detail={metric.detail}
            color={metric.color}
            href={metric.href}
            mode={layoutMode}
            hideDetail={isMicroMetricMode || dense}
          />
        ))}
      </SimpleGrid>
    </Stack>
  );

  if (!showCardShell) return content;

  return (
    <Card withBorder radius="md" p="xs" style={getCardStyle()}>
      {content}
    </Card>
  );
}

interface MetricTileProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  title?: string;
  detail?: string;
  color?: string;
  href: string;
  mode: LayoutMode;
  hideDetail: boolean;
}

function MetricTile({ icon, label, value, title, detail, color, href, mode, hideDetail }: MetricTileProps) {
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
          background: `linear-gradient(135deg, ${HERMES_COLORS.surface}, rgba(51, 51, 85, 0.56))`,
          border: `1px solid rgba(205, 127, 50, 0.35)`,
          borderRadius: 6,
          boxShadow: "inset 0 0 0 1px rgba(255, 215, 0, 0.04)",
          overflow: "hidden",
        }}
      >
        <Text c={HERMES_COLORS.dim} lh={1} style={{ display: "flex", flexShrink: 0 }}>
          {icon}
        </Text>
        <Anchor
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          fz={mode === "micro" ? "8px" : "9px"}
          fw={700}
          c={color ?? "inherit"}
          underline="never"
          lineClamp={1}
          title={valueTitle}
        >
          {value}
        </Anchor>
      </Group>
    );
  }

  return (
    <Stack
      gap={0}
      p={isDense ? 3 : 5}
      style={{
        border: "1px solid var(--mantine-color-default-border)",
        background: `linear-gradient(135deg, ${HERMES_COLORS.surface}, rgba(51, 51, 85, 0.48))`,
        borderColor: "rgba(205, 127, 50, 0.32)",
        borderRadius: isDense ? 6 : 8,
        boxShadow: "inset 0 0 0 1px rgba(255, 215, 0, 0.04)",
        overflow: "hidden",
      }}
    >
      <Group gap={isDense ? 2 : 4} wrap="nowrap" miw={0}>
        <Text c={HERMES_COLORS.dim} lh={1} style={{ display: "flex", flexShrink: 0 }}>
          {icon}
        </Text>
        <Text fz={isDense ? "9px" : "xs"} c={HERMES_COLORS.label} lineClamp={1}>
          {label}
        </Text>
      </Group>
      <Group gap={isDense ? 2 : 4} wrap="nowrap" miw={0}>
        <Anchor
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          fz={isDense ? "11px" : "sm"}
          fw={700}
          c={color ?? "inherit"}
          underline="never"
          lineClamp={1}
          title={valueTitle}
        >
          {value}
        </Anchor>
        {detail && !hideDetail && (
          <Text fz={isDense ? "9px" : "xs"} c={HERMES_COLORS.dim} lineClamp={1}>
            {detail}
          </Text>
        )}
      </Group>
    </Stack>
  );
}

function getCompactReleaseValue(release: string, isDense: boolean, isMicro: boolean) {
  if (!isDense) return release;

  const segments = release.replace(/^v/, "").split(".");
  if (segments.length >= 2 && segments[0] && segments[1]) {
    if (isMicro && segments[0].length === 4) {
      return `v${segments[0].slice(2)}.${segments[1]}`;
    }

    return `v${segments[0]}.${segments[1]}`;
  }

  return release;
}

function getDashboardUrl(dashboardUrl: string, path: string) {
  return `${dashboardUrl}${path}`;
}

function getLayoutMode(width: number, height: number): LayoutMode {
  if (width < 130 && height < 130) return "micro";
  if (height < 130) return "strip";
  if (width < 150) return "tall";
  if (width >= 380 && height >= 190) return "showcase";
  return "standard";
}

function getMetricColumns(mode: LayoutMode, width: number) {
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

function getVisibleMetrics(mode: LayoutMode, metrics: MetricDefinition[]) {
  const visibleIds = getVisibleMetricIds(mode);
  return metrics.filter((metric) => visibleIds.includes(metric.id));
}

function getVisibleMetricIds(mode: LayoutMode) {
  switch (mode) {
    case "micro":
      return ["release", "commits", "jobs", "skills"];
    case "strip":
    case "tall":
      return ["release", "commits", "jobs", "skills", "platforms", "toolsets"];
    case "standard":
    case "showcase":
      return ["release", "commits", "jobs", "skills", "platforms", "toolsets", "agents", "sessions"];
  }
}

function getContentGap(mode: LayoutMode) {
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

function getMetricSpacing(mode: LayoutMode) {
  return mode === "showcase" ? 6 : mode === "standard" ? 4 : 2;
}

function getLogoSize(mode: LayoutMode) {
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

function getTitleSize(mode: LayoutMode) {
  switch (mode) {
    case "micro":
      return "10px";
    case "strip":
    case "tall":
      return "11px";
    case "standard":
      return "sm";
    case "showcase":
      return "md";
  }
}

function getCardStyle() {
  return {
    background: `linear-gradient(135deg, rgba(26, 26, 46, 0.98), rgba(26, 26, 46, 0.78) 42%, rgba(51, 51, 85, 0.52))`,
    border: `1px solid rgba(205, 127, 50, 0.38)`,
    boxShadow: "inset 0 0 0 1px rgba(255, 215, 0, 0.06), 0 0 18px rgba(255, 191, 0, 0.08)",
    overflow: "hidden",
  };
}

function getContentStyle(mode: LayoutMode) {
  if (mode === "standard" || mode === "showcase") {
    return { overflow: "hidden" };
  }

  return {
    background: `linear-gradient(135deg, rgba(26, 26, 46, 0.9), rgba(51, 51, 85, 0.42))`,
    borderLeft: `2px solid ${HERMES_COLORS.border}`,
    borderRadius: 6,
    boxShadow: "inset 0 0 0 1px rgba(255, 215, 0, 0.05)",
    overflow: "hidden",
    paddingLeft: 3,
  };
}

function getRatioColor(active: number, total: number) {
  if (total === 0) return HERMES_COLORS.dim;
  if (active === total) return HERMES_COLORS.ok;
  if (active > 0) return HERMES_COLORS.warn;
  return HERMES_COLORS.error;
}

function getNeutralCountColor(value: number) {
  return value > 0 ? HERMES_COLORS.label : HERMES_COLORS.dim;
}

function getCompactStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case "connected":
    case "ok":
    case "ready":
    case "running":
      return "OK";
    case "disconnected":
    case "failed":
    case "fatal":
      return "ERR";
    case "queued":
    case "retrying":
    case "starting":
    case "stopping":
    case "waiting_for_approval":
      return "WAIT";
    default:
      return status.length > 3 ? status.slice(0, 3).toUpperCase() : status.toUpperCase();
  }
}
