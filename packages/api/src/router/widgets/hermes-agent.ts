import { observable } from "@trpc/server/observable";

import type { HermesAgentOverview } from "@homarr/integrations/types";
import { hermesAgentRequestHandler } from "@homarr/request-handler/hermes-agent";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const hermesAgentRouter = createTRPCRouter({
  getOverviews: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "hermesAgent"))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = hermesAgentRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

          return {
            integrationId: integration.id,
            integrationName: integration.name,
            integrationUrl: integration.url,
            overview: data,
            updatedAt: timestamp,
          };
        }),
      );

      return results;
    }),
  subscribeOverviews: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "hermesAgent"))
    .subscription(({ ctx }) => {
      return observable<{ integrationId: string; overview: HermesAgentOverview; timestamp: Date }>((emit) => {
        const unsubscribes = ctx.integrations.map((integration) => {
          const innerHandler = hermesAgentRequestHandler.handler(integration, {});
          return innerHandler.subscribe((overview) => {
            emit.next({
              integrationId: integration.id,
              overview,
              timestamp: new Date(),
            });
          });
        });

        return () => {
          unsubscribes.forEach((unsubscribe) => unsubscribe());
        };
      });
    }),
});
