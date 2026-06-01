import dayjs from "dayjs";
import { Badge, Group, Stack, Text } from "@mantine/core";

import type { HermesJob, HermesSession, HermesToolset, HermesPlatformStatus } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { formatTokenCount, getJobKey, getStatusColor } from "./utils";

interface PlatformsListProps {
  platforms: Record<string, HermesPlatformStatus>;
}

export function PlatformsList({ platforms }: PlatformsListProps) {
  const t = useScopedI18n("widget.hermesAgent");
  const entries = Object.entries(platforms).toSorted(([nameA], [nameB]) => nameA.localeCompare(nameB));

  if (entries.length === 0) return <EmptyText text={t("empty.platforms")} />;

  return (
    <Stack gap={4}>
      {entries.map(([name, platform]) => (
        <Group key={name} justify="space-between" wrap="nowrap" gap="xs">
          <Group gap={6} wrap="nowrap" miw={0}>
            <Badge variant="dot" color={getStatusColor(platform.state)} size="xs">
              {platform.state ?? t("unknown")}
            </Badge>
            <Text size="xs" fw={500} lineClamp={1}>
              {name}
            </Text>
          </Group>
          {platform.updated_at && (
            <Text size="xs" c="dimmed" ta="right" style={{ whiteSpace: "nowrap" }}>
              {dayjs(platform.updated_at).fromNow()}
            </Text>
          )}
        </Group>
      ))}
    </Stack>
  );
}

interface SessionsListProps {
  sessions: HermesSession[];
}

export function SessionsList({ sessions }: SessionsListProps) {
  const t = useScopedI18n("widget.hermesAgent");
  const visibleSessions = sessions.slice(0, 5);

  if (visibleSessions.length === 0) return <EmptyText text={t("empty.sessions")} />;

  return (
    <Stack gap={6}>
      {visibleSessions.map((session) => (
        <Stack key={session.id} gap={1}>
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Text size="xs" fw={500} lineClamp={1}>
              {session.title ?? session.id}
            </Text>
            {session.source && (
              <Badge size="xs" variant="light">
                {session.source}
              </Badge>
            )}
          </Group>
          {session.preview && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {session.preview}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            {t("sessions.meta", {
              messages: `${session.message_count ?? 0}`,
              tools: `${session.tool_call_count ?? 0}`,
              tokens: formatTokenCount((session.input_tokens ?? 0) + (session.output_tokens ?? 0)),
            })}
            {session.last_active ? ` - ${dayjs(session.last_active).fromNow()}` : ""}
          </Text>
        </Stack>
      ))}
    </Stack>
  );
}

interface JobsListProps {
  jobs: HermesJob[];
}

export function JobsList({ jobs }: JobsListProps) {
  const t = useScopedI18n("widget.hermesAgent");
  const visibleJobs = jobs.slice(0, 5);

  if (visibleJobs.length === 0) return <EmptyText text={t("empty.jobs")} />;

  return (
    <Stack gap={6}>
      {visibleJobs.map((job, index) => {
        const isPaused = job.paused === true || job.enabled === false;
        return (
          <Stack key={getJobKey(job, index)} gap={1}>
            <Group justify="space-between" wrap="nowrap" gap="xs">
              <Text size="xs" fw={500} lineClamp={1}>
                {job.name ?? job.id ?? job.job_id ?? t("jobs.unnamed")}
              </Text>
              <Badge size="xs" variant="light" color={isPaused ? "yellow" : "green"}>
                {isPaused ? t("jobs.paused") : t("jobs.enabled")}
              </Badge>
            </Group>
            {job.prompt && (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {job.prompt}
              </Text>
            )}
            <Text size="xs" c="dimmed">
              {job.schedule ?? t("jobs.noSchedule")}
              {job.next_run_at ? ` - ${t("jobs.next", { when: dayjs(job.next_run_at).fromNow() })}` : ""}
            </Text>
          </Stack>
        );
      })}
    </Stack>
  );
}

interface ToolsetsListProps {
  toolsets: HermesToolset[];
}

export function ToolsetsList({ toolsets }: ToolsetsListProps) {
  const t = useScopedI18n("widget.hermesAgent");
  const enabledToolsets = toolsets.filter((toolset) => toolset.enabled === true);

  if (toolsets.length === 0) return <EmptyText text={t("empty.toolsets")} />;

  return (
    <Stack gap={4}>
      {enabledToolsets.slice(0, 8).map((toolset) => (
        <Group key={toolset.name} justify="space-between" wrap="nowrap" gap="xs">
          <Text size="xs" fw={500} lineClamp={1}>
            {toolset.label ?? toolset.name}
          </Text>
          <Badge size="xs" variant="light" color={toolset.configured === false ? "yellow" : "green"}>
            {t("toolsets.tools", { count: toolset.tools.length })}
          </Badge>
        </Group>
      ))}
      {enabledToolsets.length === 0 && <EmptyText text={t("empty.enabledToolsets")} />}
    </Stack>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <Text size="xs" c="dimmed" ta="center" py={4}>
      {text}
    </Text>
  );
}
