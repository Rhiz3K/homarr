import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { Notification } from "../interfaces/notifications/notification-types";
import type { INotificationsIntegration } from "../interfaces/notifications/notifications-integration";
import { pushoverMessagesResponseSchema } from "./pushover-schema";

const maximumNotificationCount = 100;

// Pushover requires every Open Client request to identify the application, see https://pushover.net/api/client#friendly
const requestHeaders = { "User-Agent": "Homarr (+https://homarr.dev)" };

/**
 * Homarr acts as an unofficial Pushover Open Client device (https://pushover.net/api/client).
 * It only downloads the messages queued for its own device and never deletes or acknowledges them,
 * so the history stays on the Pushover servers (up to 21 days) and the other devices are not affected.
 */
export class PushoverIntegration extends Integration implements INotificationsIntegration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.getMessagesUrl(), { headers: requestHeaders });
    if (!response.ok) {
      return TestConnectionError.StatusResult({ status: response.status, url: this.getRedactedMessagesUrl() });
    }

    pushoverMessagesResponseSchema.parse(await response.json());
    return { success: true };
  }

  public async getNotificationsAsync(): Promise<Notification[]> {
    const response = await fetchWithTrustedCertificatesAsync(this.getMessagesUrl(), { headers: requestHeaders });
    // The session secret is part of the query string, so the original url must never end up in an error
    if (!response.ok) throw new ResponseError({ status: response.status, url: this.getRedactedMessagesUrl() });

    const { messages } = pushoverMessagesResponseSchema.parse(await response.json());

    return messages
      .toSorted((messageA, messageB) => messageB.date - messageA.date)
      .slice(0, maximumNotificationCount)
      .map(
        (message): Notification => ({
          id: message.id_str,
          time: new Date(message.date * 1000),
          // Pushover recommends showing the application name when a message has no title
          title: message.title?.trim() || message.app,
          body: message.html === 1 ? stripPushoverHtml(message.message) : message.message,
          href: message.url || undefined,
          source: {
            name: message.app,
            iconUrl: message.icon ? this.url(`/icons/${encodeURIComponent(message.icon)}.png`).toString() : undefined,
          },
        }),
      );
  }

  private getMessagesUrl() {
    return this.url("/1/messages.json", {
      secret: this.getSecretValue("sessionSecret"),
      device_id: this.getSecretValue("deviceId"),
    });
  }

  private getRedactedMessagesUrl() {
    return this.url("/1/messages.json").toString();
  }
}

/**
 * Pushover messages can contain a limited set of html tags (b, i, u, font, a).
 * The notifications widget renders plain text, so the tags are removed and entities are decoded.
 */
export const stripPushoverHtml = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .trim();
