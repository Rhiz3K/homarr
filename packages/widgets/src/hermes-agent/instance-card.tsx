import type { ReactNode } from "react";
import { Badge, Card, Group, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  IconActivity,
  IconCalendarTime,
  IconGitCommit,
  IconPackage,
  IconPlugConnected,
  IconRobot,
  IconTools,
} from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import type { HermesAgentInstance } from "./types";
import { getJobSummary, getStatusColor } from "./utils";

interface HermesAgentInstanceCardProps {
  instance: HermesAgentInstance;
  isTiny: boolean;
}

export function HermesAgentInstanceCard({ instance, isTiny }: HermesAgentInstanceCardProps) {
  const t = useScopedI18n("widget.hermesAgent");
  const { overview } = instance;
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

  return (
    <Card withBorder radius="md" p="xs">
      <Stack gap={6}>
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Group gap="xs" wrap="nowrap" miw={0}>
            <ThemeIcon color="violet" variant="light" size="sm">
              <IconRobot size={14} />
            </ThemeIcon>
            <Stack gap={0} miw={0}>
              <Text size="sm" fw={700} lineClamp={1}>
                {instance.integrationName}
              </Text>
              <Text size="xs" c="dimmed" lineClamp={1}>
                {t("meta.version", { version })}
              </Text>
            </Stack>
          </Group>
          <Badge variant="dot" color={getStatusColor(gatewayState)} size="sm">
            {gatewayState ?? t("unknown")}
          </Badge>
        </Group>

        <SimpleGrid cols={isTiny ? 2 : 4} spacing={4}>
          <MetricTile
            icon={<IconPackage size={13} />}
            label={t("summary.release")}
            value={release}
            color={overview.update?.hasNewRelease ? "yellow" : "green"}
          />
          <MetricTile
            icon={<IconGitCommit size={13} />}
            label={t("summary.commits")}
            value={commitsBehind ?? t("unknownShort")}
            color={commitsBehind && commitsBehind > 0 ? "yellow" : "green"}
          />
          <MetricTile
            icon={<IconCalendarTime size={13} />}
            label={t("summary.jobs")}
            value={`${jobSummary.active}/${jobSummary.total}`}
            detail={jobSummary.failed > 0 ? t("jobs.failed", { count: `${jobSummary.failed}` }) : t("jobs.ok")}
            color={jobSummary.failed > 0 ? "red" : "green"}
          />
          <MetricTile
            icon={<IconTools size={13} />}
            label={t("summary.skills")}
            value={overview.skills.length > 0 ? `${enabledSkills}/${overview.skills.length}` : t("unknownShort")}
          />
          <MetricTile
            icon={<IconPlugConnected size={13} />}
            label={t("summary.platforms")}
            value={`${connectedPlatforms}/${platformEntries.length}`}
            color={connectedPlatforms === platformEntries.length ? "green" : "yellow"}
          />
          <MetricTile
            icon={<IconTools size={13} />}
            label={t("summary.toolsets")}
            value={`${enabledToolsets}/${overview.toolsets.length}`}
          />
          <MetricTile
            icon={<IconActivity size={13} />}
            label={t("summary.activeAgents")}
            value={overview.health.active_agents}
          />
          <MetricTile icon={<IconActivity size={13} />} label={t("summary.sessions")} value={activeSessions} />
        </SimpleGrid>
      </Stack>
    </Card>
  );
}

interface MetricTileProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail?: string;
  color?: string;
}

function MetricTile({ icon, label, value, detail, color }: MetricTileProps) {
  return (
    <Stack gap={1} p={5} style={{ border: "1px solid var(--mantine-color-default-border)", borderRadius: 8 }}>
      <Group gap={4} wrap="nowrap">
        <Text c="dimmed" lh={1}>
          {icon}
        </Text>
        <Text size="xs" c="dimmed" lineClamp={1}>
          {label}
        </Text>
      </Group>
      <Group gap={4} wrap="nowrap">
        <Text size="sm" fw={700} c={color} lineClamp={1}>
          {value}
        </Text>
        {detail && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {detail}
          </Text>
        )}
      </Group>
    </Stack>
  );
}
