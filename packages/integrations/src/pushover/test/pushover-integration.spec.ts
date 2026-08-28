// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
  process.env.ENABLE_DNS_CACHING = "false";
});

vi.mock("@homarr/redis", () => ({
  createGetSetChannel: () => ({
    getAsync: () => Promise.resolve(null),
    setAsync: () => Promise.resolve(),
    removeAsync: () => Promise.resolve(),
  }),
}));

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  ErrorWithMetadata: class extends Error {},
}));

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: (url: URL | string, init?: RequestInit) => fetch(url, init),
  createAxiosCertificateInstanceAsync: vi.fn().mockResolvedValue({}),
  createCertificateAgentAsync: vi.fn().mockResolvedValue({ close: vi.fn() }),
  createCustomCheckServerIdentity: vi.fn(() => vi.fn()),
}));

vi.mock("@homarr/core/infrastructure/certificates", () => ({
  getTrustedCertificateHostnamesAsync: vi.fn().mockResolvedValue([]),
  getAllTrustedCertificatesAsync: vi.fn().mockResolvedValue([]),
}));

import type { IntegrationTestingInput } from "../../base/integration";
import { TestConnectionService } from "../../base/test-connection/test-connection-service";
import { PushoverIntegration, stripPushoverHtml } from "../pushover-integration";

const sessionSecret = "SGx2Su5onMcXU2EVozWG41Fws42bHo0aOrmA3tQ3jjRMSu1HwMEmOWNWPD7J";
const deviceId = "zQie8WjzFTWkMz5CcGrUNK2t5rR9zGTsfYQ7HHGs";

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const invalidSecretResponse = () => jsonResponse({ status: 0, secret: "invalid", errors: ["secret is invalid"] }, 403);

// Example message from https://pushover.net/api/client#download
// The numeric ids are omitted because they exceed Number.MAX_SAFE_INTEGER
const createMessage = (overrides: Record<string, unknown> = {}) => ({
  id_str: "380698801670733826",
  umid_str: "380698801670733826",
  title: "Backup finished",
  message: "Nightly backup completed",
  app: "Backup",
  aid_str: "380698715771387905",
  icon: "HopmnR5uQ4cmXen",
  date: 1409605784,
  priority: 0,
  acked: 0,
  ...overrides,
});

class TestablePushoverIntegration extends PushoverIntegration {
  public async testWithFetchAsync(fetchAsync: IntegrationTestingInput["fetchAsync"]) {
    return await this.testingAsync({ fetchAsync } as IntegrationTestingInput);
  }
}

const createIntegration = () =>
  new TestablePushoverIntegration({
    id: "test-pushover",
    name: "Test Pushover",
    url: "https://api.pushover.net",
    externalUrl: null,
    decryptedSecrets: [
      { kind: "sessionSecret", value: sessionSecret },
      { kind: "deviceId", value: deviceId },
    ],
  });

const collectErrorText = (error: unknown): string => {
  if (!(error instanceof Error)) return String(error);
  const url = "url" in error ? String(error.url) : "";
  return `${error.message} ${url} ${collectErrorText(error.cause)}`;
};

describe("stripPushoverHtml", () => {
  test("removes tags and decodes entities", () => {
    expect(
      stripPushoverHtml('<b>Disk</b> at 95%<br>see <a href="https://nas.local">details</a> &amp; act &lt;now&gt;'),
    ).toBe("Disk at 95%\nsee details & act <now>");
  });
});

describe("PushoverIntegration", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test("requests the messages of the registered device with the session secret and a user agent", async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(jsonResponse({ status: 1, messages: [] })),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(createIntegration().getNotificationsAsync()).resolves.toEqual([]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(`${url.origin}${url.pathname}`).toBe("https://api.pushover.net/1/messages.json");
    expect(url.searchParams.get("secret")).toBe(sessionSecret);
    expect(url.searchParams.get("device_id")).toBe(deviceId);
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("User-Agent")).toContain("Homarr");
  });

  test("maps messages to notifications sorted by date", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        jsonResponse({
          status: 1,
          messages: [
            createMessage(),
            createMessage({
              id_str: "380698969174458372",
              title: "",
              message: '<b>Disk</b> almost full<br>Check <a href="https://nas.local">the NAS</a>',
              html: 1,
              app: "Monitoring",
              icon: "default",
              date: 1409605795,
              url: "https://nas.local/status",
              url_title: "Open status",
            }),
          ],
        }),
      ),
    ) as typeof fetch;

    await expect(createIntegration().getNotificationsAsync()).resolves.toEqual([
      {
        id: "380698969174458372",
        time: new Date(1409605795 * 1000),
        title: "Monitoring",
        body: "Disk almost full\nCheck the NAS",
        href: "https://nas.local/status",
        source: { name: "Monitoring", iconUrl: "https://api.pushover.net/icons/default.png" },
      },
      {
        id: "380698801670733826",
        time: new Date(1409605784 * 1000),
        title: "Backup finished",
        body: "Nightly backup completed",
        href: undefined,
        source: { name: "Backup", iconUrl: "https://api.pushover.net/icons/HopmnR5uQ4cmXen.png" },
      },
    ]);
  });

  test("returns at most 100 of the newest messages", async () => {
    const messages = Array.from({ length: 150 }, (_, index) =>
      createMessage({ id_str: `message-${index}`, date: 1_700_000_000 + index }),
    );
    globalThis.fetch = vi.fn(() => Promise.resolve(jsonResponse({ status: 1, messages }))) as typeof fetch;

    const notifications = await createIntegration().getNotificationsAsync();

    expect(notifications).toHaveLength(100);
    expect(notifications[0]?.id).toBe("message-149");
    expect(notifications.at(-1)?.id).toBe("message-50");
  });

  test("never leaks the session secret when the request fails", async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve(invalidSecretResponse())) as typeof fetch;

    const error: unknown = await createIntegration()
      .getNotificationsAsync()
      .then(() => null)
      .catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(Error);
    expect(collectErrorText(error)).toContain("https://api.pushover.net/1/messages.json");
    expect(collectErrorText(error)).not.toContain(sessionSecret);
  });

  test("uses the same messages request for connection testing", async () => {
    const fetchAsync = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(jsonResponse({ status: 1, messages: [createMessage()] })),
    );

    await expect(
      createIntegration().testWithFetchAsync(fetchAsync as unknown as IntegrationTestingInput["fetchAsync"]),
    ).resolves.toEqual({ success: true });
    expect(String(fetchAsync.mock.calls[0]?.[0])).toContain("https://api.pushover.net/1/messages.json?secret=");
    expect(new Headers(fetchAsync.mock.calls[0]?.[1]?.headers).get("User-Agent")).toContain("Homarr");
  });

  test("reports an invalid session secret as an authorization error", async () => {
    const fetchAsync = vi.fn(() => Promise.resolve(invalidSecretResponse()));

    const result = await new TestConnectionService(new URL("https://api.pushover.net")).handleAsync(
      async () =>
        await createIntegration().testWithFetchAsync(fetchAsync as unknown as IntegrationTestingInput["fetchAsync"]),
    );

    expect(result).toMatchObject({
      success: false,
      error: {
        type: "authorization",
        data: { statusCode: 403, reason: "forbidden" },
      },
    });
  });

  test("reports server errors without the query string", async () => {
    const fetchAsync = vi.fn(() => Promise.resolve(jsonResponse({ status: 0 }, 500)));

    const result = await new TestConnectionService(new URL("https://api.pushover.net")).handleAsync(
      async () =>
        await createIntegration().testWithFetchAsync(fetchAsync as unknown as IntegrationTestingInput["fetchAsync"]),
    );

    expect(result).toMatchObject({
      success: false,
      error: {
        type: "statusCode",
        data: { statusCode: 500, reason: "internalServerError", url: "https://api.pushover.net/1/messages.json" },
      },
    });
  });
});
