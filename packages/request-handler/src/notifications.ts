import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { Notification } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

type NotificationsIntegrationKind = IntegrationKindByCategory<"notifications">;

const createNotificationsRequestHandler = (options?: { cacheTtlMs?: number; fallbackToStaleOnError?: boolean }) =>
  createIntegrationRequestHandler<Notification[], NotificationsIntegrationKind, Record<string, never>>({
    async requestAsync(integration) {
      const integrationInstance = await createIntegrationAsync(integration);
      return await integrationInstance.getNotificationsAsync();
    },
    ...options,
  });

export const notificationsRequestHandler = createNotificationsRequestHandler();

/**
 * Pushover asks Open Clients not to poll frequently and temporarily blocks IPs that flood its API.
 * Its notifications are therefore cached longer and stale data is served while Pushover is unavailable.
 */
export const pushoverNotificationsRequestHandler = createNotificationsRequestHandler({
  cacheTtlMs: 60_000,
  fallbackToStaleOnError: true,
});

export const getNotificationsRequestHandler = (kind: NotificationsIntegrationKind) =>
  kind === "pushover" ? pushoverNotificationsRequestHandler : notificationsRequestHandler;
