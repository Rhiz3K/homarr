"use client";

import { ScrollArea, Stack } from "@mantine/core";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import { HermesAgentInstanceCard } from "./instance-card";

export default function HermesAgentWidget({ integrationIds, width, isEditMode }: WidgetComponentProps<"hermesAgent">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationDataError();
  }

  return <HermesAgentContent integrationIds={integrationIds} width={width} isEditMode={isEditMode} />;
}

interface HermesAgentContentProps {
  integrationIds: string[];
  width: number;
  isEditMode: boolean;
}

function HermesAgentContent({ integrationIds, width, isEditMode }: HermesAgentContentProps) {
  const [instances] = clientApi.widget.hermesAgent.getOverviews.useSuspenseQuery({ integrationIds });
  const utils = clientApi.useUtils();

  clientApi.widget.hermesAgent.subscribeOverviews.useSubscription(
    { integrationIds },
    {
      enabled: !isEditMode,
      onData(newData) {
        utils.widget.hermesAgent.getOverviews.setData({ integrationIds }, (prevData) => {
          if (!prevData) return prevData;
          return prevData.map((instance) =>
            instance.integrationId === newData.integrationId
              ? { ...instance, overview: newData.overview, updatedAt: newData.timestamp }
              : instance,
          );
        });
      },
    },
  );

  const isTiny = width < 280;

  return (
    <ScrollArea h="100%">
      <Stack gap="xs" p="xs">
        {instances.map((instance) => (
          <HermesAgentInstanceCard key={instance.integrationId} instance={instance} isTiny={isTiny} />
        ))}
      </Stack>
    </ScrollArea>
  );
}
