import { hermesAgentRequestHandler } from "@homarr/request-handler/hermes-agent";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const hermesAgentRouter = createTRPCRouter({
  getOverviews: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "hermesAgent"))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(ctx.integrations, async (integration) => {
        const innerHandler = hermesAgentRequestHandler.handler(integration, {});
        const { data, timestamp } = await innerHandler.getDataAsync();

        return {
          integrationId: integration.id,
          integrationName: integration.name,
          integrationUrl: integration.url,
          overview: data,
          updatedAt: timestamp,
        };
      });
    }),
});
