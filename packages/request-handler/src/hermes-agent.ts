import dayjs from "dayjs";

import { createIntegrationAsync } from "@homarr/integrations";
import type { HermesAgentOverview } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const hermesAgentRequestHandler = createCachedIntegrationRequestHandler<
  HermesAgentOverview,
  "hermesAgent",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getOverviewAsync();
  },
  cacheDuration: dayjs.duration(30, "seconds"),
  queryKey: "hermesAgentOverview",
});
