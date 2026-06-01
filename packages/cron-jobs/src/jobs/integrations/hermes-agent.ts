import { EVERY_30_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { hermesAgentRequestHandler } from "@homarr/request-handler/hermes-agent";
import { createRequestIntegrationJobHandler } from "@homarr/request-handler/lib/cached-request-integration-job-handler";

import { createCronJob } from "../../lib";

export const hermesAgentJob = createCronJob("hermesAgent", EVERY_30_SECONDS).withCallback(
  createRequestIntegrationJobHandler(hermesAgentRequestHandler.handler, {
    widgetKinds: ["hermesAgent"],
    getInput: {
      hermesAgent: () => ({}),
    },
  }),
);
