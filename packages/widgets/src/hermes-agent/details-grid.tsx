import { Anchor, Divider, Group, Paper, SimpleGrid, Text } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { getDetailsTypography, getJobListLayout } from "./layout";
import { JobsList, PlatformsList, SessionsList, ToolsetsList } from "./lists";
import { HERMES_CHROME_TEXT_STYLE, useHermesTheme } from "./theme";
import type { HermesAgentSuccessInstance } from "./types";

export type HermesDashboardRoutes = Record<
  "config" | "cron" | "profiles" | "sessions" | "skills" | "system",
  string | null
>;

interface DetailsGridProps {
  instance: HermesAgentSuccessInstance;
  options: WidgetComponentProps<"hermesAgent">["options"];
  routes: HermesDashboardRoutes;
  linkToDashboard: boolean;
  width: number;
  columns: number;
  maxSections: number;
  itemLimit: number;
}

export function DetailsGrid({
  instance,
  options,
  routes,
  linkToDashboard,
  width,
  columns,
  maxSections,
  itemLimit,
}: DetailsGridProps) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  const { overview } = instance;
  const details = overview.details;
  const enabledSectionCount = [
    options.showPlatforms,
    options.showSessions,
    options.showJobs,
    options.showToolsets,
  ].filter(Boolean).length;
  const detailColumns = Math.max(1, Math.min(columns, maxSections, enabledSectionCount));
  const typography = getDetailsTypography(width, detailColumns);
  const restrictedContent = <RestrictedText fontSize={typography.auxiliary} />;
  const jobListLayout = getJobListLayout(width, detailColumns, itemLimit);
  const sections = [
    options.showPlatforms
      ? {
          id: "platforms",
          label: t("sections.platforms"),
          href: routes.sessions,
          content: overview.detailsRestricted ? (
            restrictedContent
          ) : (
            <PlatformsList platforms={details?.platforms ?? []} maxItems={itemLimit} typography={typography} />
          ),
        }
      : null,
    options.showSessions
      ? {
          id: "sessions",
          label: t("sections.sessions"),
          href: routes.sessions,
          content: overview.detailsRestricted ? (
            restrictedContent
          ) : overview.dataAvailability.sessions ? (
            <SessionsList sessions={details?.sessions ?? []} maxItems={itemLimit} typography={typography} />
          ) : (
            <UnavailableText fontSize={typography.auxiliary} />
          ),
        }
      : null,
    options.showJobs
      ? {
          id: "jobs",
          label: t("sections.jobs"),
          href: routes.cron,
          content: overview.detailsRestricted ? (
            restrictedContent
          ) : overview.dataAvailability.jobs ? (
            <JobsList
              jobs={details?.jobs ?? []}
              maxItems={jobListLayout.maxItems}
              lineClamp={jobListLayout.lineClamp}
              typography={typography}
            />
          ) : (
            <UnavailableText fontSize={typography.auxiliary} />
          ),
        }
      : null,
    options.showToolsets
      ? {
          id: "toolsets",
          label: t("sections.toolsets"),
          href: routes.skills,
          content: overview.detailsRestricted ? (
            restrictedContent
          ) : overview.dataAvailability.toolsets ? (
            <ToolsetsList toolsets={details?.toolsets ?? []} maxItems={itemLimit} typography={typography} />
          ) : (
            <UnavailableText fontSize={typography.auxiliary} />
          ),
        }
      : null,
  ].filter((section): section is NonNullable<typeof section> => section !== null);

  if (sections.length === 0) return null;

  const sectionPriority = ["sessions", "jobs", "platforms", "toolsets"];
  const visibleSections =
    maxSections >= sections.length
      ? sections
      : sectionPriority
          .flatMap((sectionId) => sections.filter((section) => section.id === sectionId))
          .slice(0, maxSections);
  const visibleColumns = Math.min(columns, visibleSections.length);
  const gridRows = Math.ceil(visibleSections.length / visibleColumns);

  return (
    <SimpleGrid
      cols={visibleColumns}
      spacing="xs"
      verticalSpacing="xs"
      style={{
        flex: "1 1 0",
        minHeight: 0,
        overflow: "hidden",
        gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
      }}
    >
      {visibleSections.map((section) => {
        const panel = (
          <Paper
            withBorder
            radius="sm"
            p={8}
            h="100%"
            miw={0}
            style={{ background: theme.surface, borderColor: theme.border, overflow: "hidden" }}
          >
            <Group justify="space-between" gap={4} wrap="nowrap">
              <Text
                fz={typography.heading}
                lh={1.2}
                fw={700}
                c={theme.textPrimary}
                lineClamp={1}
                title={section.label}
                style={{ ...HERMES_CHROME_TEXT_STYLE, minWidth: 0 }}
              >
                {section.label}
              </Text>
              {linkToDashboard && section.href && (
                <Text c={theme.textSecondary} lh={1}>
                  <IconExternalLink size={typography.icon} aria-hidden="true" />
                </Text>
              )}
            </Group>
            <Divider my={4} color={theme.border} />
            {section.content}
          </Paper>
        );

        if (!linkToDashboard || !section.href) {
          return (
            <div key={section.id} style={{ height: "100%", minWidth: 0 }}>
              {panel}
            </div>
          );
        }

        return (
          <Anchor
            key={section.id}
            href={section.href}
            target="_blank"
            rel="noopener noreferrer"
            underline="never"
            aria-label={t("action.openSection", { section: section.label })}
            style={{ display: "block", height: "100%", minWidth: 0, color: "inherit" }}
          >
            {panel}
          </Anchor>
        );
      })}
    </SimpleGrid>
  );
}

function RestrictedText({ fontSize }: { fontSize: number }) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  return (
    <Text fz={fontSize} c={theme.textTertiary} ta="center" py={4}>
      {t("empty.restricted")}
    </Text>
  );
}

function UnavailableText({ fontSize }: { fontSize: number }) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  return (
    <Text fz={fontSize} c={theme.textTertiary} ta="center" py={4}>
      {t("empty.unavailable")}
    </Text>
  );
}
