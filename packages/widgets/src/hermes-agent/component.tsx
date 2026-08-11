"use client";

import { Paper, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import { HermesAgentInstanceCard } from "./instance-card";
import type { HermesAgentSuccessInstance } from "./types";

export default function HermesAgentWidget({
  options,
  integrationIds,
  width,
  height,
  isEditMode,
}: WidgetComponentProps<"hermesAgent">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationDataError();
  }

  return (
    <HermesAgentContent
      options={options}
      integrationIds={integrationIds}
      width={width}
      height={height}
      isEditMode={isEditMode}
    />
  );
}

interface HermesAgentContentProps {
  options: WidgetComponentProps<"hermesAgent">["options"];
  integrationIds: string[];
  width: number;
  height: number;
  isEditMode: boolean;
}

function HermesAgentContent({ options, integrationIds, width, height, isEditMode }: HermesAgentContentProps) {
  const t = useScopedI18n("widget.hermesAgent");
  const [instances] = clientApi.widget.hermesAgent.getOverviews.useSuspenseQuery(
    { integrationIds },
    { refetchInterval: isEditMode ? false : 30_000 },
  );

  const isNarrow = width < 180;
  const isTinyWidth = isNarrow || width < 280;
  const gap = isTinyWidth ? 4 : 8;
  const padding = height < 170 ? 2 : isTinyWidth ? 4 : 8;
  const availableHeight = height - padding * 2 - gap * Math.max(0, instances.length - 1);
  const cardHeight = Math.max(0, Math.floor(availableHeight / Math.max(1, instances.length)));

  return (
    <Stack h="100%" gap={gap} p={padding} style={{ overflow: "hidden" }}>
      {instances.length === 0 && <HermesAgentErrorCard height={cardHeight} message={t("error.internalServerError")} />}
      {instances.map((instance) => {
        if (!instance.overview || !instance.updatedAt) {
          return (
            <HermesAgentErrorCard
              key={instance.integrationId}
              height={cardHeight}
              name={instance.integrationName}
              message={t("error.internalServerError")}
            />
          );
        }

        const isShort = cardHeight < 170;
        const isTiny = isTinyWidth || isShort;
        const successInstance = {
          ...instance,
          overview: instance.overview,
          updatedAt: instance.updatedAt,
          error: null,
        } satisfies HermesAgentSuccessInstance;

        return (
          <HermesAgentInstanceCard
            key={instance.integrationId}
            instance={successInstance}
            width={width}
            height={cardHeight}
            isNarrow={isNarrow}
            isShort={isShort}
            isTiny={isTiny}
            options={options}
          />
        );
      })}
    </Stack>
  );
}

function HermesAgentErrorCard({ height, name, message }: { height: number; name?: string; message: string }) {
  return (
    <Paper h={height} withBorder radius="md" p="sm" style={{ overflow: "hidden" }}>
      <Stack gap={2}>
        {name && (
          <Text size="sm" fw={600} lineClamp={1}>
            {name}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          {message}
        </Text>
      </Stack>
    </Paper>
  );
}
