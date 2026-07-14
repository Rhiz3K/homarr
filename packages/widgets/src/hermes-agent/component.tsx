"use client";

import { ScrollArea, Stack } from "@mantine/core";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import { HermesAgentInstanceCard } from "./instance-card";

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
  const [instances] = clientApi.widget.hermesAgent.getOverviews.useSuspenseQuery(
    { integrationIds },
    { refetchInterval: isEditMode ? false : 30_000 },
  );

  const isNarrow = width < 180;
  const isShort = height < 170;
  const isTiny = isNarrow || isShort || width < 280;

  return (
    <ScrollArea h="100%">
      <Stack gap={isTiny ? 4 : "xs"} p={isShort ? 2 : isTiny ? 4 : "xs"}>
        {instances.map((instance) => (
          <HermesAgentInstanceCard
            key={instance.integrationId}
            instance={instance}
            width={width}
            height={height}
            isNarrow={isNarrow}
            isShort={isShort}
            isTiny={isTiny}
            options={options}
          />
        ))}
      </Stack>
    </ScrollArea>
  );
}
