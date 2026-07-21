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

import type { HermesJob, HermesSession, HermesToolset, HermesPlatformStatus } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { getHermesPlatformChannels, getJobKey, getStatusColor, isJobFailed, isJobPaused } from "./utils";
import { HERMES_CHROME_TEXT_STYLE, HERMES_TECHNICAL_TEXT_STYLE, useHermesTheme } from "./theme";

interface PlatformsListProps {
  platforms: Record<string, HermesPlatformStatus>;
  sessions: HermesSession[];
}

export function PlatformsList({ platforms, sessions }: PlatformsListProps) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  const entries = Object.entries(platforms).toSorted(([nameA], [nameB]) => nameA.localeCompare(nameB));
  const channels = getHermesPlatformChannels(sessions);

  if (entries.length === 0) return <EmptyText text={t("empty.platforms")} />;

  return (
    <Stack gap={4}>
      {entries.map(([name, platform]) => {
        const platformChannels = channels.filter((channel) => channel.platform === name.toLowerCase());

        return (
          <Stack key={name} gap={3}>
            <Group justify="space-between" wrap="nowrap" gap={6}>
              <Group gap={5} wrap="nowrap" miw={0}>
                <Box
                  component="span"
                  w={7}
                  h={7}
                  style={{
                    borderRadius: "50%",
                    background: `var(--mantine-color-${getStatusColor(platform.state)}-6)`,
                    flexShrink: 0,
                  }}
                  title={platform.state ?? t("unknown")}
                >
                  <VisuallyHidden>{platform.state ?? t("unknown")}</VisuallyHidden>
                </Box>
                <Text size="xs" fw={600} c={theme.textPrimary} lh={1.25}>
                  {name}
                </Text>
                {platformChannels.length > 0 && (
                  <Text
                    size="xs"
                    fw={700}
                    c={theme.success}
                    title={t("platforms.channelCount", { count: platformChannels.length })}
                    style={{ ...HERMES_TECHNICAL_TEXT_STYLE, whiteSpace: "nowrap" }}
                  >
                    {platformChannels.length}
                  </Text>
                )}
              </Group>
              {platform.updated_at && (
                <Text size="xs" c={theme.textTertiary} ta="right" lh={1.25} style={{ whiteSpace: "nowrap" }}>
                  {dayjs(platform.updated_at).fromNow()}
                </Text>
              )}
            </Group>
            {platformChannels.length > 0 && (
              <Stack gap={2} ml={12}>
                {platformChannels.map((channel) => {
                  const channelName =
                    channel.displayName ?? maskChannelId(channel.chatId) ?? t("platforms.unknownChannel");
                  const channelKind = channel.threadId ? `#${channel.threadId}` : channel.chatType?.toUpperCase();

                  return (
                    <Group key={channel.id} justify="space-between" wrap="nowrap" gap={5} mih={20}>
                      <Group gap={4} wrap="nowrap" miw={0}>
                        <Text size="xs" c={theme.textSecondary} lh={1.25} lineClamp={1} title={channelName}>
                          {channelName}
                        </Text>
                        {channelKind && (
                          <Text
                            size="xs"
                            fw={600}
                            c={theme.textTertiary}
                            title={
                              channel.threadId
                                ? t("platforms.topic", { id: channel.threadId })
                                : (channel.chatType ?? undefined)
                            }
                            style={{ ...HERMES_TECHNICAL_TEXT_STYLE, whiteSpace: "nowrap" }}
                          >
                            {channelKind}
                          </Text>
                        )}
                      </Group>
                      <Text
                        size="xs"
                        c={theme.textTertiary}
                        title={t("platforms.sessionCount", { count: channel.sessionCount })}
                        style={{ ...HERMES_TECHNICAL_TEXT_STYLE, whiteSpace: "nowrap", flexShrink: 0 }}
                      >
                        ×{channel.sessionCount}
                      </Text>
                    </Group>
                  );
                })}
              </Stack>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}

const maskChannelId = (chatId: string | null) => {
  if (!chatId) return null;
  return chatId.length > 4 ? `••••${chatId.slice(-4)}` : "••••";
};

interface SessionsListProps {
  sessions: HermesSession[];
}

export function SessionsList({ sessions }: SessionsListProps) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  const visibleSessions = sessions.slice(0, 15);

  if (visibleSessions.length === 0) return <EmptyText text={t("empty.sessions")} />;

  return (
    <Stack gap={3}>
      {visibleSessions.map((session) => {
        const title = session.title ?? session.id;

        return (
          <Group key={session.id} gap={5} wrap="nowrap" mih={20}>
            <Text size="xs" fw={500} c={theme.textPrimary} lh={1.3} lineClamp={1} title={title} style={{ flex: 1 }}>
              {title}
            </Text>
            {session.source && <SessionSourceIcon source={session.source} />}
          </Group>
        );
      })}
    </Stack>
  );
}

interface JobsListProps {
  jobs: HermesJob[];
}

export function JobsList({ jobs }: JobsListProps) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  const visibleJobs = jobs.slice(0, 6);

  if (visibleJobs.length === 0) return <EmptyText text={t("empty.jobs")} />;

  return (
    <Stack gap={3}>
      {visibleJobs.map((job, index) => {
        const isFailed = isJobFailed(job);
        const isPaused = isJobPaused(job);
        const name = job.name ?? job.id ?? job.job_id ?? t("jobs.unnamed");
        const status = isFailed ? t("jobs.failedLabel") : isPaused ? t("jobs.paused") : t("jobs.enabled");
        const schedule = `${job.schedule ?? t("jobs.noSchedule")}${
          job.next_run_at ? ` - ${t("jobs.next", { when: dayjs(job.next_run_at).fromNow() })}` : ""
        }`;

        return (
          <Group key={getJobKey(job, index)} justify="space-between" wrap="nowrap" gap={5} mih={20}>
            <Text
              size="xs"
              fw={500}
              c={theme.textPrimary}
              lh={1.3}
              lineClamp={1}
              title={`${name} · ${schedule}`}
              style={{ flex: 1 }}
            >
              {name}
            </Text>
            <Text
              size="xs"
              fw={700}
              c={isFailed ? theme.error : isPaused ? theme.warning : theme.success}
              lh={1.25}
              title={schedule}
              style={{ ...HERMES_CHROME_TEXT_STYLE, whiteSpace: "nowrap" }}
            >
              {status}
            </Text>
          </Group>
        );
      })}
    </Stack>
  );
}

function SessionSourceIcon({ source }: { source: string }) {
  const theme = useHermesTheme();
  const normalizedSource = source.toLowerCase();
  const iconProps = { size: 14, stroke: 1.8, "aria-hidden": true } as const;
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

interface ToolsetsListProps {
  toolsets: HermesToolset[];
}

export function ToolsetsList({ toolsets }: ToolsetsListProps) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  const enabledToolsets = toolsets.filter((toolset) => toolset.enabled === true);

  if (toolsets.length === 0) return <EmptyText text={t("empty.toolsets")} />;

  return (
    <Stack gap={3}>
      {enabledToolsets.slice(0, 10).map((toolset) => (
        <Group key={toolset.name} justify="space-between" align="flex-start" wrap="nowrap" gap={5} mih={20}>
          <Text size="xs" fw={500} c={theme.textPrimary} lh={1.3} lineClamp={2} title={toolset.label ?? toolset.name}>
            {toolset.label ?? toolset.name}
          </Text>
          <Text
            size="xs"
            fw={700}
            c={toolset.configured === false ? theme.warning : theme.success}
            title={t("toolsets.tools", { count: toolset.tools.length })}
            style={{ ...HERMES_TECHNICAL_TEXT_STYLE, whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {toolset.tools.length}
          </Text>
        </Group>
      ))}
      {enabledToolsets.length === 0 && <EmptyText text={t("empty.enabledToolsets")} />}
    </Stack>
  );
}

function EmptyText({ text }: { text: string }) {
  const theme = useHermesTheme();
  return (
    <Text size="xs" c={theme.textTertiary} ta="center" py={4}>
      {text}
    </Text>
  );
}
