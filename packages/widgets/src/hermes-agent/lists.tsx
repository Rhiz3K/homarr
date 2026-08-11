import dayjs from "dayjs";
import { Box, Group, Stack, Text, Tooltip, VisuallyHidden } from "@mantine/core";
import {
  IconApi,
  IconBrandDiscord,
  IconBrandSlack,
  IconBrandTelegram,
  IconBrandWhatsapp,
  IconClock,
  IconMessageCircle,
  IconTerminal2,
  IconWorld,
} from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import type { DetailsTypographyScale } from "./layout";
import { getJobDisplayState, getJobSortPriority, getStatusColor } from "./utils";
import { HERMES_TECHNICAL_TEXT_STYLE, useHermesTheme } from "./theme";
import type { HermesJobDetail, HermesPlatformDetail, HermesSessionDetail, HermesToolsetDetail } from "./types";

export function PlatformsList({
  platforms,
  maxItems,
  typography,
}: {
  platforms: HermesPlatformDetail[];
  maxItems: number;
  typography: DetailsTypographyScale;
}) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  const entries = platforms
    .toSorted((platformA, platformB) => platformA.name.localeCompare(platformB.name))
    .slice(0, maxItems);

  if (entries.length === 0) return <EmptyText text={t("empty.platforms")} fontSize={typography.auxiliary} />;

  return (
    <Stack gap={typography.rowGap}>
      {entries.map((platform) => {
        const updatedLabel = platform.updatedAt
          ? t("footer.updated", { when: dayjs(platform.updatedAt).fromNow() })
          : null;

        return (
          <Group key={platform.name} justify="space-between" wrap="nowrap" gap={4} mih={getRowMinHeight(typography)}>
            <Group gap={5} wrap="nowrap" miw={0} style={{ flex: "1 1 auto" }}>
              <Box
                component="span"
                w={typography.indicator}
                h={typography.indicator}
                style={{
                  borderRadius: "50%",
                  background: `var(--mantine-color-${getStatusColor(platform.state)}-6)`,
                  flexShrink: 0,
                }}
                title={platform.state ?? t("unknown")}
              >
                <VisuallyHidden>{platform.state ?? t("unknown")}</VisuallyHidden>
              </Box>
              <Text
                fz={typography.item}
                fw={600}
                c={theme.textPrimary}
                lh={1.25}
                lineClamp={1}
                title={platform.name}
                style={{ flex: "1 1 auto", minWidth: 0 }}
              >
                {platform.name}
              </Text>
            </Group>
            {updatedLabel && (
              <Tooltip label={updatedLabel} openDelay={400}>
                <Box component="span" c={theme.textTertiary} style={{ display: "inline-flex", flexShrink: 0 }}>
                  <IconClock size={typography.icon} stroke={1.8} aria-hidden="true" />
                  <VisuallyHidden>{updatedLabel}</VisuallyHidden>
                </Box>
              </Tooltip>
            )}
          </Group>
        );
      })}
    </Stack>
  );
}

export function SessionsList({
  sessions,
  maxItems,
  typography,
}: {
  sessions: HermesSessionDetail[];
  maxItems: number;
  typography: DetailsTypographyScale;
}) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  const visibleSessions = sessions.slice(0, maxItems);

  if (visibleSessions.length === 0) return <EmptyText text={t("empty.sessions")} fontSize={typography.auxiliary} />;

  return (
    <Stack gap={typography.rowGap}>
      {visibleSessions.map((session) => {
        const title = session.title ?? session.id;

        return (
          <Group key={session.id} gap={5} wrap="nowrap" mih={getRowMinHeight(typography)}>
            <Text
              fz={typography.item}
              fw={500}
              c={theme.textPrimary}
              lh={1.3}
              lineClamp={1}
              title={title}
              style={{ flex: "1 1 auto", minWidth: 0 }}
            >
              {title}
            </Text>
            {session.source && <SessionSourceIcon source={session.source} size={typography.icon} />}
          </Group>
        );
      })}
    </Stack>
  );
}

export function JobsList({
  jobs,
  maxItems,
  lineClamp,
  typography,
}: {
  jobs: HermesJobDetail[];
  maxItems: number;
  lineClamp: 1 | 2 | 3;
  typography: DetailsTypographyScale;
}) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  const visibleJobs = jobs
    .toSorted((jobA, jobB) => getJobSortPriority(jobA) - getJobSortPriority(jobB))
    .slice(0, maxItems);

  if (visibleJobs.length === 0) return <EmptyText text={t("empty.jobs")} fontSize={typography.auxiliary} />;

  return (
    <Stack gap={typography.rowGap}>
      {visibleJobs.map((job) => {
        const name = job.name ?? t("jobs.unnamed");
        const displayState = getJobDisplayState(job);
        const status =
          displayState === "paused"
            ? t("jobs.paused")
            : displayState === "failed"
              ? t("jobs.failedLabel")
              : t("jobs.enabled");
        const color =
          displayState === "paused" ? theme.warning : displayState === "failed" ? theme.error : theme.success;
        const schedule = `${job.schedule ?? t("jobs.noSchedule")}${
          job.nextRunAt ? ` - ${t("jobs.next", { when: dayjs(job.nextRunAt).fromNow() })}` : ""
        }`;
        const description = `${name} · ${status} · ${schedule}`;

        return (
          <Group key={job.id} align="flex-start" wrap="nowrap" mih={getRowMinHeight(typography)} miw={0}>
            <Text
              fz={typography.item}
              fw={600}
              c={color}
              lh={lineClamp === 3 ? 1.2 : 1.3}
              lineClamp={lineClamp}
              title={description}
              aria-label={description}
              style={{ flex: "1 1 auto", minWidth: 0 }}
            >
              {name}
            </Text>
          </Group>
        );
      })}
    </Stack>
  );
}

function SessionSourceIcon({ source, size }: { source: string; size: number }) {
  const theme = useHermesTheme();
  const normalizedSource = source.toLowerCase();
  const iconProps = { size, stroke: 1.8, "aria-hidden": true } as const;
  const sourceIcon = normalizedSource.includes("telegram") ? (
    <IconBrandTelegram {...iconProps} color="#2aabee" />
  ) : normalizedSource.includes("discord") ? (
    <IconBrandDiscord {...iconProps} color="#5865f2" />
  ) : normalizedSource.includes("slack") ? (
    <IconBrandSlack {...iconProps} color="#e01e5a" />
  ) : normalizedSource.includes("whatsapp") ? (
    <IconBrandWhatsapp {...iconProps} color="#25d366" />
  ) : normalizedSource.includes("cron") ? (
    <IconClock {...iconProps} color={theme.warning} />
  ) : normalizedSource.includes("api") ? (
    <IconApi {...iconProps} color={theme.success} />
  ) : normalizedSource.includes("web") ? (
    <IconWorld {...iconProps} color={theme.success} />
  ) : normalizedSource.includes("cli") || normalizedSource.includes("terminal") ? (
    <IconTerminal2 {...iconProps} color={theme.textSecondary} />
  ) : (
    <IconMessageCircle {...iconProps} color={theme.textSecondary} />
  );

  return (
    <Tooltip label={source} openDelay={400}>
      <Box component="span" style={{ display: "inline-flex", flexShrink: 0 }}>
        {sourceIcon}
        <VisuallyHidden>{source}</VisuallyHidden>
      </Box>
    </Tooltip>
  );
}

export function ToolsetsList({
  toolsets,
  maxItems,
  typography,
}: {
  toolsets: HermesToolsetDetail[];
  maxItems: number;
  typography: DetailsTypographyScale;
}) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  const enabledToolsets = toolsets.filter((toolset) => toolset.enabled);

  if (toolsets.length === 0) return <EmptyText text={t("empty.toolsets")} fontSize={typography.auxiliary} />;

  return (
    <Stack gap={typography.rowGap}>
      {enabledToolsets.slice(0, maxItems).map((toolset) => (
        <Group
          key={toolset.name}
          justify="space-between"
          align="flex-start"
          wrap="nowrap"
          gap={5}
          mih={getRowMinHeight(typography)}
        >
          <Text
            fz={typography.item}
            fw={500}
            c={theme.textPrimary}
            lh={1.3}
            lineClamp={1}
            title={toolset.label ?? toolset.name}
            style={{ flex: "1 1 auto", minWidth: 0 }}
          >
            {toolset.label ?? toolset.name}
          </Text>
          <Text
            fz={typography.item}
            fw={700}
            c={toolset.configured === false ? theme.warning : theme.success}
            title={t("toolsets.tools", { count: toolset.toolCount })}
            style={{ ...HERMES_TECHNICAL_TEXT_STYLE, whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {toolset.toolCount}
          </Text>
        </Group>
      ))}
      {enabledToolsets.length === 0 && <EmptyText text={t("empty.enabledToolsets")} fontSize={typography.auxiliary} />}
    </Stack>
  );
}

function EmptyText({ text, fontSize }: { text: string; fontSize: number }) {
  const theme = useHermesTheme();
  return (
    <Text fz={fontSize} c={theme.textTertiary} ta="center" py={4}>
      {text}
    </Text>
  );
}

function getRowMinHeight(typography: DetailsTypographyScale) {
  return Math.ceil(typography.item * 1.3);
}
