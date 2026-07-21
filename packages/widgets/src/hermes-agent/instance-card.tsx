import dayjs from "dayjs";
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

import type { WidgetComponentProps } from "../definition";
import { DetailsGrid } from "./details-grid";
import {
  getCardStyle,
  getCompactVersionValue,
  getContentGap,
  getContentStyle,
  getLayoutMode,
  getLogoSize,
  getMetricColumns,
  getMetricSpacing,
  getTitleSize,
  getVisibleMetricIds,
} from "./layout";
import type { MetricDefinition } from "./metric-tile";
import { MetricTile } from "./metric-tile";
import type { HermesTheme } from "./theme";
import { HERMES_BRAND_THEME, HERMES_CHROME_TEXT_STYLE, HERMES_NEUTRAL_THEME, HermesThemeContext } from "./theme";
import type { HermesAgentInstance } from "./types";
import { getCompactStatusKey, getHermesGatewayState, getJobSummary, getStatusColor } from "./utils";

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
  const theme = options.brandTheme ? HERMES_BRAND_THEME : HERMES_NEUTRAL_THEME;
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
  const gatewayState = getHermesGatewayState(overview);
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
    ? theme.textTertiary
    : overview.update.hasNewRelease
      ? theme.warning
      : theme.success;
  const jobsColor = jobSummary.total === 0 ? theme.textTertiary : jobSummary.failed > 0 ? theme.error : theme.success;
  const skillsColor = overview.dataAvailability.skills
    ? getRatioColor(theme, enabledSkills, overview.skills.length)
    : theme.textTertiary;
  const platformsColor = getRatioColor(theme, connectedPlatforms, platformEntries.length);
  const toolsetsColor = overview.dataAvailability.toolsets
    ? getRatioColor(theme, enabledToolsets, overview.toolsets.length)
    : theme.textTertiary;
  const activeAgentsColor = getNeutralCountColor(theme, overview.health.active_agents);
  const activeSessionsColor = getNeutralCountColor(theme, activeSessions);
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
  const compactStatusKey = gatewayState ? getCompactStatusKey(gatewayState) : null;
  const compactStatusLabel = compactStatusKey
    ? t(`status.short.${compactStatusKey}`)
    : abbreviateStatus(gatewayState ?? t("unknown"));
  const statusLabel = isNarrow || layoutMode === "micro" ? compactStatusLabel : verboseStatusLabel;
  const titleLabel = layoutMode === "micro" || isNarrow ? "H" : instance.integrationName;
  const showVersion = layoutMode !== "micro" && !isNarrow;
  const showCardShell = layoutMode === "standard" || layoutMode === "showcase";
  const showDetails = layoutMode === "showcase" && height >= 320;
  const visibleMetricIds = getVisibleMetricIds(layoutMode);
  const metrics: MetricDefinition[] = [
    {
      id: "version",
      icon: <IconPackage size={iconSize} aria-hidden="true" />,
      label: t("summary.version"),
      value: versionValue,
      title: release ? `${version} (${release})` : version,
      color: theme.textPrimary,
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
  ];
  const visibleMetrics = metrics.filter((metric) => visibleMetricIds.includes(metric.id));

  const content = (
    <Stack
      gap={getContentGap(layoutMode)}
      justify={layoutMode === "showcase" ? "center" : undefined}
      style={getContentStyle(layoutMode, theme)}
    >
      <Group justify="space-between" wrap="nowrap" gap={dense ? 4 : "xs"}>
        <Group gap={isMicroMetricMode ? 4 : "xs"} wrap="nowrap" miw={0}>
          <Avatar
            src={getIconUrl("hermesAgent")}
            alt="Hermes Agent"
            size={getLogoSize(layoutMode)}
            radius="sm"
            styles={{ root: { border: `1px solid ${theme.borderStrong}`, background: theme.surface } }}
          />
          <Stack gap={0} miw={0}>
            {overview.mode === "dashboard" ? (
              <Anchor
                href={dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                fz={getTitleSize(layoutMode)}
                fw={700}
                c={theme.textPrimary}
                underline="never"
                lineClamp={1}
                title={`${instance.integrationName} ${t("meta.version", { version })}`}
                style={{ fontFamily: theme.fontSans, textWrap: "balance" }}
              >
                {titleLabel}
              </Anchor>
            ) : (
              <Text
                fz={getTitleSize(layoutMode)}
                fw={700}
                c={theme.textPrimary}
                lineClamp={1}
                title={`${instance.integrationName} ${t("meta.version", { version })}`}
                style={{ fontFamily: theme.fontSans, textWrap: "balance" }}
              >
                {titleLabel}
              </Text>
            )}
            {showVersion && (
              <Text size="xs" c={theme.textSecondary} lineClamp={1}>
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
              background: theme.surfaceRaised,
              border: `1px solid ${theme.border}`,
            },
            label: { color: theme.textPrimary, ...HERMES_CHROME_TEXT_STYLE },
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
              root: { color: theme.textSecondary, borderColor: theme.border },
              label: HERMES_CHROME_TEXT_STYLE,
            }}
          >
            {t(`mode.${overview.mode}`)}
          </Badge>
          <Text
            size="xs"
            c={theme.textTertiary}
            lineClamp={1}
            title={dayjs(instance.updatedAt).format("YYYY-MM-DD HH:mm:ss")}
          >
            {t("footer.updated", { when: dayjs(instance.updatedAt).fromNow() })}
          </Text>
        </Group>
      )}
    </Stack>
  );

  if (!showCardShell) return <HermesThemeContext.Provider value={theme}>{content}</HermesThemeContext.Provider>;

  return (
    <HermesThemeContext.Provider value={theme}>
      <Card withBorder radius="md" p="xs" style={getCardStyle(theme, options.brandTheme)}>
        {content}
      </Card>
    </HermesThemeContext.Provider>
  );
}

function getDashboardUrl(dashboardUrl: string, path: string) {
  return `${dashboardUrl}${path}`;
}

function getRatioColor(theme: HermesTheme, active: number, total: number) {
  if (total === 0) return theme.textTertiary;
  if (active === total) return theme.success;
  if (active > 0) return theme.warning;
  return theme.error;
}

function getNeutralCountColor(theme: HermesTheme, value: number | null) {
  return value !== null && value > 0 ? theme.textPrimary : theme.textTertiary;
}

function abbreviateStatus(status: string) {
  return status.length > 3 ? status.slice(0, 3).toUpperCase() : status.toUpperCase();
}
