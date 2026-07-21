import { useState } from "react";
import { ActionIcon, Anchor, Box, Divider, Group, Paper, SimpleGrid, Text, Tooltip } from "@mantine/core";
import { IconExternalLink, IconEye, IconEyeOff } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { JobsList, PlatformsList, SessionsList, ToolsetsList } from "./lists";
import { HERMES_CHROME_TEXT_STYLE, HERMES_THEME } from "./theme";
import type { HermesAgentInstance } from "./types";

export type HermesDashboardRoutes = Record<"config" | "cron" | "profiles" | "sessions" | "skills", string>;

interface DetailsGridProps {
  instance: HermesAgentInstance;
  options: WidgetComponentProps<"hermesAgent">["options"];
  routes: HermesDashboardRoutes;
  linkToDashboard: boolean;
  columns: number;
}

export function DetailsGrid({ instance, options, routes, linkToDashboard, columns }: DetailsGridProps) {
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
              <Text size="xs" fw={700} c={HERMES_THEME.textPrimary} lineClamp={1} style={HERMES_CHROME_TEXT_STYLE}>
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
