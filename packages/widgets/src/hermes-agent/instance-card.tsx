import { useState } from "react";
import type { ReactNode } from "react";
import dayjs from "dayjs";
import {
  ActionIcon,
  Anchor,
  Avatar,
  Badge,
  Box,
  Card,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconActivity,
  IconCalendarTime,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconGitCommit,
  IconMessageCircle,
  IconPackage,
  IconPlugConnected,
  IconSparkles,
  IconTools,
} from "@tabler/icons-react";

import { getIconUrl } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { JobsList, PlatformsList, SessionsList, ToolsetsList } from "./lists";
import { HERMES_CHROME_TEXT_STYLE, HERMES_TECHNICAL_TEXT_STYLE, HERMES_THEME } from "./theme";
import type { HermesAgentInstance } from "./types";
import { getJobSummary, getStatusColor } from "./utils";

const HERMES_COLORS = {
  border: HERMES_THEME.borderStrong,
  dim: HERMES_THEME.textTertiary,
  label: HERMES_THEME.textPrimary,
  ok: HERMES_THEME.success,
  title: HERMES_THEME.textPrimary,
  warn: HERMES_THEME.warning,
  error: HERMES_THEME.error,
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
  href?: string;
}

interface HermesAgentInstanceCardProps {
  instance: HermesAgentInstance;
  width: number;
  height: number;
  isNarrow: boolean;
  isShort: boolean;
  isTiny: boolean;
  options: WidgetComponentProps<"hermesAgent">["options"];
}

export function HermesAgentInstanceCard({
  instance,
  width,
  height,
  isNarrow,
  isShort,
  isTiny,
  options,
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
  const getModeRoute = (route: keyof typeof dashboardRoutes) =>
    overview.mode === "dashboard" ? dashboardRoutes[route] : undefined;
  const status = overview.dashboardStatus;
  const apiReadinessState =
    overview.mode === "apiServer" ? (overview.health.readiness?.status ?? overview.health.status) : null;
  const gatewayState =
    status?.nous_session_valid === "terminal"
      ? "auth_error"
      : apiReadinessState && !isHealthyStatus(apiReadinessState)
        ? apiReadinessState
        : overview.health.gateway_busy
          ? "busy"
          : overview.mode === "apiServer"
            ? (apiReadinessState ?? overview.health.gateway_state)
            : (status?.gateway_state ?? overview.health.gateway_state ?? overview.health.status);
  const platformEntries = Object.entries(status?.gateway_platforms ?? overview.health.platforms);
  const connectedPlatforms = platformEntries.filter(([, platform]) => platform.state === "connected").length;
  const enabledToolsets = overview.toolsets.filter((toolset) => toolset.enabled === true).length;
  const enabledSkills = overview.skills.filter((skill) => skill.enabled !== false).length;
  const activeSessions =
    status?.active_sessions ?? (overview.dataAvailability.sessions ? overview.sessions.length : null);
  const jobSummary = getJobSummary(overview.jobs);
  const version = status?.version ?? overview.health.version ?? t("unknown");
  const release = status?.release_date ? `v${status.release_date}` : null;
  const commitsBehind = overview.update?.commitsBehind;
  const dense = isTiny || isShort;
  const layoutMode = getLayoutMode(width, height);
  const isMicroMetricMode = layoutMode === "micro" || layoutMode === "strip" || layoutMode === "tall";
  const compactVersion = isMicroMetricMode || (layoutMode === "standard" && width < 380);
  const metricColumns = getMetricColumns(layoutMode, width);
  const iconSize =
    layoutMode === "micro" ? 7 : isMicroMetricMode ? 8 : dense ? 11 : layoutMode === "showcase" ? 15 : 13;
  const versionValue = getCompactVersionValue(version, dense || compactVersion, compactVersion);
  const updateColor = !overview.update
    ? HERMES_COLORS.dim
    : overview.update.hasNewRelease
      ? HERMES_COLORS.warn
      : HERMES_COLORS.ok;
  const jobsColor =
    jobSummary.total === 0 ? HERMES_COLORS.dim : jobSummary.failed > 0 ? HERMES_COLORS.error : HERMES_COLORS.ok;
  const skillsColor = overview.dataAvailability.skills
    ? getRatioColor(enabledSkills, overview.skills.length)
    : HERMES_COLORS.dim;
  const platformsColor = getRatioColor(connectedPlatforms, platformEntries.length);
  const toolsetsColor = overview.dataAvailability.toolsets
    ? getRatioColor(enabledToolsets, overview.toolsets.length)
    : HERMES_COLORS.dim;
  const activeAgentsColor = getNeutralCountColor(overview.health.active_agents);
  const activeSessionsColor = getNeutralCountColor(activeSessions);
  const skillsValue = !overview.dataAvailability.skills
    ? t("unknownShort")
    : overview.skills.length > 0
      ? isMicroMetricMode && enabledSkills === overview.skills.length
        ? enabledSkills
        : `${enabledSkills}/${overview.skills.length}`
      : "0";
  const toolsetsValue = overview.dataAvailability.toolsets
    ? `${enabledToolsets}/${overview.toolsets.length}`
    : t("unknownShort");
  const jobsValue = overview.dataAvailability.jobs ? `${jobSummary.active}/${jobSummary.total}` : t("unknownShort");
  const sessionsValue = activeSessions ?? t("unknownShort");
  const updateValue = !overview.update
    ? t("unknownShort")
    : !overview.update.hasNewRelease
      ? t("update.currentShort")
      : commitsBehind != null && commitsBehind > 0
        ? `+${commitsBehind}`
        : t("update.availableShort");
  const verboseStatusLabel =
    gatewayState === "auth_error" ? t("status.authError") : (gatewayState?.replaceAll("_", " ") ?? t("unknown"));
  const statusLabel =
    isNarrow || layoutMode === "micro" ? getCompactStatusLabel(gatewayState ?? t("unknown")) : verboseStatusLabel;
  const titleLabel = layoutMode === "micro" || isNarrow ? "H" : instance.integrationName;
  const showVersion = layoutMode !== "micro" && !isNarrow;
  const showCardShell = layoutMode === "standard" || layoutMode === "showcase";
  const showDetails = layoutMode === "showcase" && height >= 320;
  const visibleMetrics = getVisibleMetrics(layoutMode, [
    {
      id: "version",
      icon: <IconPackage size={iconSize} aria-hidden="true" />,
      label: t("summary.version"),
      value: versionValue,
      title: release ? `${version} (${release})` : version,
      color: HERMES_COLORS.label,
      href: getModeRoute("config"),
    },
    {
      id: "update",
      icon: <IconGitCommit size={iconSize} aria-hidden="true" />,
      label: t("summary.update"),
      value: updateValue,
      title: overview.update?.latestReleaseTag ?? release ?? undefined,
      color: updateColor,
      href: overview.update?.releaseUrl ?? getModeRoute("config"),
    },
    {
      id: "jobs",
      icon: <IconCalendarTime size={iconSize} aria-hidden="true" />,
      label: t("summary.jobs"),
      value: jobsValue,
      detail:
        overview.dataAvailability.jobs && jobSummary.failed > 0
          ? t("jobs.failed", { count: `${jobSummary.failed}` })
          : undefined,
      color: jobsColor,
      href: getModeRoute("cron"),
    },
    {
      id: "skills",
      icon: <IconSparkles size={iconSize} aria-hidden="true" />,
      label: t("summary.skills"),
      value: skillsValue,
      title: overview.dataAvailability.skills ? `${enabledSkills}/${overview.skills.length}` : t("unknownShort"),
      color: skillsColor,
      href: getModeRoute("skills"),
    },
    {
      id: "platforms",
      icon: <IconPlugConnected size={iconSize} aria-hidden="true" />,
      label: t("summary.platforms"),
      value: `${connectedPlatforms}/${platformEntries.length}`,
      color: platformsColor,
      href: getModeRoute("sessions"),
    },
    {
      id: "toolsets",
      icon: <IconTools size={iconSize} aria-hidden="true" />,
      label: t("summary.toolsets"),
      value: toolsetsValue,
      color: toolsetsColor,
      href: getModeRoute("skills"),
    },
    {
      id: "agents",
      icon: <IconActivity size={iconSize} aria-hidden="true" />,
      label: t("summary.activeAgents"),
      value: overview.health.active_agents,
      color: activeAgentsColor,
      href: getModeRoute("profiles"),
    },
    {
      id: "sessions",
      icon: <IconMessageCircle size={iconSize} aria-hidden="true" />,
      label: t("summary.sessions"),
      value: sessionsValue,
      color: activeSessionsColor,
      href: getModeRoute("sessions"),
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
          <Avatar
            src={getIconUrl("hermesAgent")}
            alt="Hermes Agent"
            size={getLogoSize(layoutMode)}
            radius="sm"
            styles={{ root: { border: `1px solid ${HERMES_THEME.borderStrong}`, background: HERMES_THEME.surface } }}
          />
          <Stack gap={0} miw={0}>
            {overview.mode === "dashboard" ? (
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
                style={{ fontFamily: HERMES_THEME.fontSans, textWrap: "balance" }}
              >
                {titleLabel}
              </Anchor>
            ) : (
              <Text
                fz={getTitleSize(layoutMode)}
                fw={700}
                c={HERMES_COLORS.title}
                lineClamp={1}
                title={`${instance.integrationName} ${t("meta.version", { version })}`}
                style={{ fontFamily: HERMES_THEME.fontSans, textWrap: "balance" }}
              >
                {titleLabel}
              </Text>
            )}
            {showVersion && (
              <Text size="xs" c={HERMES_THEME.textSecondary} lineClamp={1}>
                {t("meta.versionAndMode", { version, mode: t(`mode.${overview.mode}`) })}
              </Text>
            )}
          </Stack>
        </Group>
        <Badge
          variant={isNarrow ? "light" : "dot"}
          color={getStatusColor(gatewayState)}
          size={dense ? "xs" : "sm"}
          maw={isNarrow ? 44 : 110}
          styles={{
            root: {
              background: HERMES_THEME.surfaceRaised,
              border: `1px solid ${HERMES_THEME.border}`,
            },
            label: { color: HERMES_THEME.textPrimary, ...HERMES_CHROME_TEXT_STYLE },
          }}
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

      {showDetails && (
        <DetailsGrid
          instance={instance}
          options={options}
          routes={dashboardRoutes}
          linkToDashboard={overview.mode === "dashboard"}
          columns={width >= 720 ? 4 : 2}
        />
      )}

      {showCardShell && (
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Badge
            size="xs"
            variant="outline"
            styles={{
              root: { color: HERMES_THEME.textSecondary, borderColor: HERMES_THEME.border },
              label: HERMES_CHROME_TEXT_STYLE,
            }}
          >
            {t(`mode.${overview.mode}`)}
          </Badge>
          <Text
            size="xs"
            c={HERMES_THEME.textTertiary}
            lineClamp={1}
            title={dayjs(instance.updatedAt).format("YYYY-MM-DD HH:mm:ss")}
          >
            {t("footer.updated", { when: dayjs(instance.updatedAt).fromNow() })}
          </Text>
        </Group>
      )}
    </Stack>
  );

  if (!showCardShell) return content;

  return (
    <Card withBorder radius="md" p="xs" style={getCardStyle()}>
      {content}
    </Card>
  );
}

interface DetailsGridProps {
  instance: HermesAgentInstance;
  options: WidgetComponentProps<"hermesAgent">["options"];
  routes: Record<"config" | "cron" | "profiles" | "sessions" | "skills", string>;
  linkToDashboard: boolean;
  columns: number;
}

function DetailsGrid({ instance, options, routes, linkToDashboard, columns }: DetailsGridProps) {
  const t = useScopedI18n("widget.hermesAgent");
  const [blurredSections, setBlurredSections] = useState<Set<string>>(() => new Set());
  const { overview } = instance;
  const platforms = overview.dashboardStatus?.gateway_platforms ?? overview.health.platforms;
  const sections = [
    options.showPlatforms
      ? {
          id: "platforms",
          label: t("sections.platforms"),
          href: routes.sessions,
          content: <PlatformsList platforms={platforms} sessions={overview.sessions} />,
        }
      : null,
    options.showSessions
      ? {
          id: "sessions",
          label: t("sections.sessions"),
          href: routes.sessions,
          content: overview.dataAvailability.sessions ? (
            <SessionsList sessions={overview.sessions} />
          ) : (
            <UnavailableText />
          ),
        }
      : null,
    options.showJobs
      ? {
          id: "jobs",
          label: t("sections.jobs"),
          href: routes.cron,
          content: overview.dataAvailability.jobs ? <JobsList jobs={overview.jobs} /> : <UnavailableText />,
        }
      : null,
    options.showToolsets
      ? {
          id: "toolsets",
          label: t("sections.toolsets"),
          href: routes.skills,
          content: overview.dataAvailability.toolsets ? (
            <ToolsetsList toolsets={overview.toolsets} />
          ) : (
            <UnavailableText />
          ),
        }
      : null,
  ].filter((section): section is NonNullable<typeof section> => section !== null);

  if (sections.length === 0) return null;

  return (
    <SimpleGrid cols={Math.min(columns, sections.length)} spacing="xs" verticalSpacing="xs">
      {sections.map((section) => {
        const isBlurred = blurredSections.has(section.id);
        const privacyLabel = t(isBlurred ? "action.showSectionContent" : "action.hideSectionContent", {
          section: section.label,
        });

        return (
          <Paper
            key={section.id}
            withBorder
            radius="sm"
            p={8}
            miw={0}
            style={{ background: HERMES_THEME.surface, borderColor: HERMES_THEME.border }}
          >
            <Group justify="space-between" gap={4} wrap="nowrap">
              <Text size="xs" fw={700} c={HERMES_COLORS.label} lineClamp={1} style={HERMES_CHROME_TEXT_STYLE}>
                {section.label}
              </Text>
              <Group gap={2} wrap="nowrap">
                <Tooltip label={privacyLabel} openDelay={400}>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="xs"
                    aria-label={privacyLabel}
                    aria-pressed={isBlurred}
                    style={{ color: HERMES_THEME.textSecondary }}
                    onClick={() => {
                      setBlurredSections((current) => {
                        const next = new Set(current);
                        if (next.has(section.id)) next.delete(section.id);
                        else next.add(section.id);
                        return next;
                      });
                    }}
                  >
                    {isBlurred ? <IconEye size={13} aria-hidden="true" /> : <IconEyeOff size={13} aria-hidden="true" />}
                  </ActionIcon>
                </Tooltip>
                {linkToDashboard && (
                  <Anchor
                    href={section.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    c={HERMES_THEME.textSecondary}
                    lh={1}
                    aria-label={t("action.openSection", { section: section.label })}
                  >
                    <IconExternalLink size={13} aria-hidden="true" />
                  </Anchor>
                )}
              </Group>
            </Group>
            <Divider my={4} color={HERMES_THEME.border} />
            <Box
              aria-hidden={isBlurred}
              style={{
                filter: isBlurred ? "blur(6px)" : undefined,
                opacity: isBlurred ? 0.72 : 1,
                pointerEvents: isBlurred ? "none" : undefined,
                userSelect: isBlurred ? "none" : undefined,
              }}
            >
              {section.content}
            </Box>
          </Paper>
        );
      })}
    </SimpleGrid>
  );
}

function UnavailableText() {
  const t = useScopedI18n("widget.hermesAgent");
  return (
    <Text size="xs" c={HERMES_THEME.textTertiary} ta="center" py={4}>
      {t("empty.unavailable")}
    </Text>
  );
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
          background: HERMES_THEME.surface,
          border: `1px solid ${HERMES_THEME.border}`,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <Text c={HERMES_COLORS.dim} lh={1} style={{ display: "flex", flexShrink: 0 }}>
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
        <Text c={HERMES_COLORS.dim} lh={1} style={{ display: "flex", flexShrink: 0 }}>
          {icon}
        </Text>
        <Text
          size="xs"
          c={HERMES_COLORS.label}
          lineClamp={1}
          style={{ ...HERMES_CHROME_TEXT_STYLE, letterSpacing: "0.04em", minWidth: 0 }}
        >
          {label}
        </Text>
      </Group>
      <Group gap={isDense ? 2 : 4} wrap="nowrap" miw={0}>
        <MetricValue href={href} value={value} title={valueTitle} color={color} fontSize={isDense ? "xs" : "sm"} />
        {detail && !hideDetail && (
          <Text size="xs" c={HERMES_COLORS.dim} lineClamp={1}>
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

function getCompactVersionValue(version: string, isDense: boolean, isMicro: boolean) {
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
      return ["version", "update", "jobs", "skills"];
    case "strip":
    case "tall":
      return ["version", "update", "jobs", "skills", "platforms", "toolsets"];
    case "standard":
    case "showcase":
      return ["version", "update", "jobs", "skills", "platforms", "toolsets", "agents", "sessions"];
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
    case "strip":
    case "tall":
      return "xs";
    case "standard":
      return "sm";
    case "showcase":
      return "md";
  }
}

function getCardStyle() {
  return {
    background: `radial-gradient(circle at top right, ${HERMES_THEME.glow}, transparent 42%), ${HERMES_THEME.background}`,
    border: `1px solid ${HERMES_THEME.borderStrong}`,
    boxShadow: `inset 0 1px 0 ${HERMES_THEME.border}, 0 0 20px rgba(4, 28, 28, 0.2)`,
    color: HERMES_THEME.textPrimary,
    fontFamily: HERMES_THEME.fontSans,
    overflow: "hidden",
  };
}

function getContentStyle(mode: LayoutMode) {
  if (mode === "standard" || mode === "showcase") {
    return { overflow: "hidden" };
  }

  return {
    background: HERMES_THEME.surface,
    borderLeft: `2px solid ${HERMES_COLORS.border}`,
    borderRadius: 8,
    boxShadow: `inset 0 0 0 1px ${HERMES_THEME.border}`,
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

function getNeutralCountColor(value: number | null) {
  return value !== null && value > 0 ? HERMES_COLORS.label : HERMES_COLORS.dim;
}

function isHealthyStatus(status: string) {
  return ["connected", "ok", "ready", "running"].includes(status.toLowerCase());
}

function getCompactStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case "connected":
    case "ok":
    case "ready":
    case "running":
      return "OK";
    case "busy":
      return "BUSY";
    case "degraded":
      return "WARN";
    case "auth_error":
      return "AUTH";
    case "error":
    case "unhealthy":
    case "not_ready":
    case "disconnected":
    case "failed":
    case "fatal":
    case "startup_failed":
    case "stopped":
      return "ERR";
    case "draining":
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
