import type { HermesAgentOverview, HermesJob } from "@homarr/integrations/types";

export interface HermesAgentWidgetOverview {
  mode: "apiServer" | "dashboard";
  version: string | null;
  release: string | null;
  gatewayState: string | null;
  update: {
    latestReleaseTag: string;
    hasNewRelease: boolean;
    commitsBehind: number | null;
    releaseUrl: string | null;
  } | null;
  summary: {
    activeAgents: number;
    activeSessions: number | null;
    platforms: { connected: number; total: number };
    sessions: number | null;
    jobs: { total: number; active: number; failed: number; paused: number };
    skills: { enabled: number; total: number };
    toolsets: { enabled: number; total: number };
  };
  dataAvailability: HermesAgentOverview["dataAvailability"];
  detailsRestricted: boolean;
  details: {
    platforms: { name: string; state: string | null; updatedAt: string | null }[];
    sessions: { id: string; title: string | null; source: string | null }[];
    jobs: {
      id: string;
      name: string | null;
      schedule: string | null;
      nextRunAt: string | null;
      paused: boolean;
      failed: boolean;
    }[];
    toolsets: {
      name: string;
      label: string | null;
      enabled: boolean;
      configured: boolean | null;
      toolCount: number;
    }[];
  } | null;
}

export const toHermesAgentWidgetOverview = (
  overview: HermesAgentOverview,
  includeDetails: boolean,
): HermesAgentWidgetOverview => {
  const platformEntries = Object.entries(overview.dashboardStatus?.gateway_platforms ?? overview.health.platforms);
  const jobSummary = getJobSummary(overview.jobs);
  const enabledSkills = overview.skills.filter((skill) => skill.enabled !== false).length;
  const enabledToolsets = overview.toolsets.filter((toolset) => toolset.enabled === true).length;
  const sessionCount = overview.dataAvailability.sessions ? overview.sessions.length : null;

  return {
    mode: overview.mode,
    version: overview.dashboardStatus?.version ?? overview.health.version ?? null,
    release: overview.dashboardStatus?.release_date ? `v${overview.dashboardStatus.release_date}` : null,
    gatewayState: getGatewayState(overview),
    update: overview.update
      ? {
          latestReleaseTag: overview.update.latestReleaseTag,
          hasNewRelease: overview.update.hasNewRelease,
          commitsBehind: overview.update.commitsBehind,
          releaseUrl: overview.update.releaseUrl,
        }
      : null,
    summary: {
      activeAgents: overview.health.active_agents,
      activeSessions: overview.dashboardStatus?.active_sessions ?? sessionCount,
      platforms: {
        connected: platformEntries.filter(([, platform]) => platform.state === "connected").length,
        total: platformEntries.length,
      },
      sessions: sessionCount,
      jobs: jobSummary,
      skills: { enabled: enabledSkills, total: overview.skills.length },
      toolsets: { enabled: enabledToolsets, total: overview.toolsets.length },
    },
    dataAvailability: { ...overview.dataAvailability },
    detailsRestricted: !includeDetails,
    details: includeDetails
      ? {
          platforms: platformEntries.map(([name, platform]) => ({
            name,
            state: platform.state ?? null,
            updatedAt: platform.updated_at ?? null,
          })),
          sessions: overview.sessions.map((session) => ({
            id: session.id,
            title: session.title ?? null,
            source: session.source ?? null,
          })),
          jobs: overview.jobs.map((job, index) => ({
            id: job.id ?? job.job_id ?? job.name ?? `job-${index}`,
            name: job.name ?? null,
            schedule: job.schedule ?? null,
            nextRunAt: job.next_run_at ?? null,
            paused: isJobPaused(job),
            failed: isJobFailed(job),
          })),
          toolsets: overview.toolsets.map((toolset) => ({
            name: toolset.name,
            label: toolset.label ?? null,
            enabled: toolset.enabled === true,
            configured: toolset.configured ?? null,
            toolCount: toolset.tools.length,
          })),
        }
      : null,
  };
};

const healthyStatuses = ["connected", "ok", "ready", "running"];

const getGatewayState = (overview: HermesAgentOverview) => {
  if (overview.dashboardStatus?.nous_session_valid === "terminal") return "auth_error";

  const apiReadinessState =
    overview.mode === "apiServer" ? (overview.health.readiness?.status ?? overview.health.status) : null;
  if (apiReadinessState && !healthyStatuses.includes(apiReadinessState.toLowerCase())) return apiReadinessState;
  if (overview.health.gateway_busy) return "busy";
  if (overview.mode === "apiServer") return apiReadinessState ?? overview.health.gateway_state ?? null;

  return overview.dashboardStatus?.gateway_state ?? overview.health.gateway_state ?? overview.health.status;
};

const isJobPaused = (job: HermesJob) =>
  job.paused === true || job.enabled === false || job.state?.toLowerCase() === "paused";

const isJobFailed = (job: HermesJob) =>
  job.has_error || ["error", "failed"].includes(job.last_status?.toLowerCase() ?? "");

const getJobSummary = (jobs: HermesJob[]) =>
  jobs.reduce(
    (summary, job) => {
      const paused = isJobPaused(job);
      const failed = isJobFailed(job);
      return {
        total: summary.total + 1,
        active: summary.active + (paused ? 0 : 1),
        failed: summary.failed + (failed ? 1 : 0),
        paused: summary.paused + (paused ? 1 : 0),
      };
    },
    { total: 0, active: 0, failed: 0, paused: 0 },
  );
