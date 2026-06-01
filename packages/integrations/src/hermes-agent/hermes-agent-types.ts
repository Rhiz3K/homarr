import { z } from "zod/v4";

const hermesPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const hermesHealthSchema = z.object({
  status: z.string(),
  platform: z.string().nullish(),
});

export type HermesHealth = z.infer<typeof hermesHealthSchema>;

export const hermesPlatformStatusSchema = z.object({
  state: z.string().nullish(),
  updated_at: z.string().nullish(),
  error: z.string().nullish(),
});

export type HermesPlatformStatus = z.infer<typeof hermesPlatformStatusSchema>;

export const hermesDetailedHealthSchema = hermesHealthSchema.extend({
  gateway_state: z.string().nullish(),
  platforms: z.record(z.string(), hermesPlatformStatusSchema).default({}),
  active_agents: z.number().default(0),
  exit_reason: z.string().nullish(),
  updated_at: z.string().nullish(),
  pid: z.number().nullish(),
});

export type HermesDetailedHealth = z.infer<typeof hermesDetailedHealthSchema>;

export const hermesCapabilitiesSchema = z.object({
  object: z.string().nullish(),
  platform: z.string().nullish(),
  model: z.string().nullish(),
  auth: z
    .object({
      type: z.string().nullish(),
      required: z.boolean().nullish(),
    })
    .nullish(),
  features: z.record(z.string(), hermesPrimitiveSchema).default({}),
});

export type HermesCapabilities = z.infer<typeof hermesCapabilitiesSchema>;

export const hermesDashboardStatusSchema = z.object({
  version: z.string().nullish(),
  release_date: z.string().nullish(),
  config_version: z.number().nullish(),
  latest_config_version: z.number().nullish(),
  gateway_running: z.boolean().nullish(),
  gateway_state: z.string().nullish(),
  gateway_platforms: z.record(z.string(), hermesPlatformStatusSchema).default({}),
  gateway_exit_reason: z.string().nullish(),
  gateway_updated_at: z.string().nullish(),
  active_sessions: z.number().nullish(),
  auth_required: z.boolean().nullish(),
  auth_providers: z.array(z.string()).default([]),
});

export type HermesDashboardStatus = z.infer<typeof hermesDashboardStatusSchema>;

export const hermesSkillSchema = z.object({
  name: z.string(),
  category: z.string().nullish(),
  enabled: z.boolean().nullish(),
});

export type HermesSkill = z.infer<typeof hermesSkillSchema>;

export const hermesSkillsResponseSchema = z.array(hermesSkillSchema);

export const hermesReleaseSchema = z.object({
  tag_name: z.string(),
  html_url: z.string().nullish(),
});

export const hermesCompareSchema = z.object({
  ahead_by: z.number().nullish(),
  total_commits: z.number().nullish(),
});

export interface HermesUpdateStatus {
  currentReleaseTag: string;
  latestReleaseTag: string;
  hasNewRelease: boolean;
  commitsBehind: number | null;
  releaseUrl: string | null;
}

export const hermesModelSchema = z.object({
  id: z.string(),
  owned_by: z.string().nullish(),
  created: z.number().nullish(),
});

export type HermesModel = z.infer<typeof hermesModelSchema>;

export const hermesModelsResponseSchema = z.object({
  data: z.array(hermesModelSchema),
});

export const hermesSessionSchema = z.object({
  id: z.string(),
  source: z.string().nullish(),
  user_id: z.string().nullish(),
  model: z.string().nullish(),
  title: z.string().nullish(),
  message_count: z.number().nullish(),
  tool_call_count: z.number().nullish(),
  input_tokens: z.number().nullish(),
  output_tokens: z.number().nullish(),
  estimated_cost_usd: z.number().nullish(),
  actual_cost_usd: z.number().nullish(),
  last_active: z.string().nullish(),
  preview: z.string().nullish(),
});

export type HermesSession = z.infer<typeof hermesSessionSchema>;

export const hermesSessionsResponseSchema = z
  .union([
    z.array(hermesSessionSchema),
    z.object({ data: z.array(hermesSessionSchema) }),
    z.object({ sessions: z.array(hermesSessionSchema) }),
  ])
  .transform((value) => (Array.isArray(value) ? value : "sessions" in value ? value.sessions : value.data));

const hermesJobScheduleSchema = z.union([
  z.string(),
  z.object({
    display: z.string().nullish(),
    expr: z.string().nullish(),
  }),
]);

export const hermesJobSchema = z
  .object({
    id: z.string().nullish(),
    job_id: z.string().nullish(),
    name: z.string().nullish(),
    schedule: hermesJobScheduleSchema.nullish(),
    schedule_display: z.string().nullish(),
    prompt: z.string().nullish(),
    deliver: z.string().nullish(),
    enabled: z.boolean().nullish(),
    paused: z.boolean().nullish(),
    state: z.string().nullish(),
    last_status: z.string().nullish(),
    next_run_at: z.string().nullish(),
    last_run_at: z.string().nullish(),
    last_success_at: z.string().nullish(),
    last_error: z.string().nullish(),
    last_delivery_error: z.string().nullish(),
    repeat: z.unknown().nullish(),
    skills: z.array(z.string()).nullish(),
  })
  .transform(({ schedule, schedule_display, ...job }) => ({
    ...job,
    schedule:
      schedule_display ?? (typeof schedule === "string" ? schedule : (schedule?.display ?? schedule?.expr ?? null)),
  }));

export type HermesJob = z.infer<typeof hermesJobSchema>;

export const hermesJobsResponseSchema = z
  .union([
    z.array(hermesJobSchema),
    z.object({ data: z.array(hermesJobSchema) }),
    z.object({ jobs: z.array(hermesJobSchema) }),
  ])
  .transform((value) => (Array.isArray(value) ? value : "jobs" in value ? value.jobs : value.data));

export const hermesToolsetSchema = z.object({
  name: z.string(),
  label: z.string().nullish(),
  description: z.string().nullish(),
  enabled: z.boolean().nullish(),
  configured: z.boolean().nullish(),
  tools: z.array(z.string()).default([]),
});

export type HermesToolset = z.infer<typeof hermesToolsetSchema>;

export const hermesToolsetsResponseSchema = z
  .union([z.array(hermesToolsetSchema), z.object({ data: z.array(hermesToolsetSchema) })])
  .transform((value) => (Array.isArray(value) ? value : value.data));

export interface HermesAgentOverview {
  health: HermesDetailedHealth;
  capabilities: HermesCapabilities;
  models: HermesModel[];
  sessions: HermesSession[];
  jobs: HermesJob[];
  toolsets: HermesToolset[];
  dashboardStatus: HermesDashboardStatus | null;
  skills: HermesSkill[];
  update: HermesUpdateStatus | null;
}
