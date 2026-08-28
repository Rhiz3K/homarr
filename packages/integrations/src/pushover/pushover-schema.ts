import { z } from "zod/v4";

// See: https://pushover.net/api/client#download
// Pushover ids are 64-bit integers, so only their string representations are used.
// There are more properties, but they are not required for this use case.
export const pushoverMessageSchema = z.object({
  id_str: z.string(),
  title: z.string().nullish(),
  message: z.string(),
  app: z.string(),
  icon: z.string().nullish(),
  date: z.number(),
  url: z.string().nullish(),
  html: z.number().nullish(),
});

export const pushoverMessagesResponseSchema = z.object({
  status: z.number(),
  messages: z.array(pushoverMessageSchema),
});
