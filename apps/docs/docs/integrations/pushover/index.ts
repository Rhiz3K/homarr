import type { IntegrationDefinition } from "@site/src/types";

export const pushoverIntegration = {
  name: "Pushover",
  description: "Pushover is a push notification service for Android, iOS and desktop devices.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/pushover.svg",
  path: "../../integrations/pushover",
} satisfies IntegrationDefinition;
