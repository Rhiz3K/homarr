import { describe, expect, test } from "vitest";

import {
  getDetailsLayout,
  getDetailsTypography,
  getJobListLayout,
  getLayoutMode,
  getMetricColumns,
  getTypographyScale,
  getVisibleMetricIds,
} from "./layout";
import { getCompactStatusKey, getJobDisplayState, getJobSortPriority, getStatusColor } from "./utils";

describe("Hermes Agent widget utilities", () => {
  test("maps current gateway and readiness states to semantic colors", () => {
    expect(getStatusColor("ready")).toBe("green");
    expect(getStatusColor("degraded")).toBe("yellow");
    expect(getStatusColor("draining")).toBe("yellow");
    expect(getStatusColor("auth_error")).toBe("red");
    expect(getStatusColor("startup_failed")).toBe("red");
    expect(getStatusColor("stopped")).toBe("red");
  });

  test("maps gateway states to compact label keys", () => {
    expect(getCompactStatusKey("running")).toBe("ok");
    expect(getCompactStatusKey("waiting_for_approval")).toBe("wait");
    expect(getCompactStatusKey("startup_failed")).toBe("error");
    expect(getCompactStatusKey("something_else")).toBeNull();
  });

  test("sorts failed jobs first while paused wins the display state", () => {
    const failed = { failed: true, paused: false };
    const paused = { failed: false, paused: true };
    const failedAndPaused = { failed: true, paused: true };
    const enabled = { failed: false, paused: false };

    expect(getJobSortPriority(failed)).toBe(0);
    expect(getJobSortPriority(failedAndPaused)).toBe(0);
    expect(getJobSortPriority(paused)).toBe(1);
    expect(getJobSortPriority(enabled)).toBe(2);
    expect(getJobDisplayState(failedAndPaused)).toBe("paused");
    expect(getJobDisplayState(failed)).toBe("failed");
  });

  test("replaces the unavailable update metric in compact layouts", () => {
    expect(getVisibleMetricIds("micro", true)).toEqual(["version", "update", "jobs", "skills"]);
    expect(getVisibleMetricIds("micro", false)).toEqual(["version", "jobs", "skills", "platforms"]);
    expect(getVisibleMetricIds("showcase", false)).not.toContain("update");
  });

  test("gives the one-row 1x1 and 2x1 tiles dedicated layouts", () => {
    expect(getLayoutMode(99, 99)).toBe("micro");
    expect(getLayoutMode(224, 99)).toBe("mini");
    expect(getLayoutMode(349, 99)).toBe("strip");
    expect(getLayoutMode(160, 160)).toBe("micro");
    expect(getLayoutMode(345, 160)).toBe("mini");
    expect(getLayoutMode(530, 160)).toBe("strip");
    expect(getLayoutMode(224, 224)).toBe("standard");
    expect(getLayoutMode(188, 188)).toBe("micro");
    expect(getLayoutMode(188, 358)).toBe("tall");
    expect(getLayoutMode(219, 438)).toBe("tall");
    expect(getLayoutMode(224, 448)).toBe("standard");
    expect(getMetricColumns("micro", 99)).toBe(2);
    expect(getMetricColumns("mini", 224)).toBe(3);
    expect(getMetricColumns("strip", 420)).toBe(3);
    expect(getMetricColumns("strip", 449)).toBe(3);
    expect(getMetricColumns("strip", 467)).toBe(6);
    expect(getMetricColumns("strip", 499)).toBe(6);
    expect(getMetricColumns("strip", 530)).toBe(6);
    expect(getVisibleMetricIds("mini", true)).toEqual(["version", "update", "jobs", "skills", "platforms", "toolsets"]);
    expect(getVisibleMetricIds("tall", true)).toEqual([
      "version",
      "update",
      "jobs",
      "skills",
      "platforms",
      "toolsets",
      "agents",
      "sessions",
    ]);
  });

  test("fits detail sections and rows to standard widget sizes without scrolling", () => {
    expect(getLayoutMode(500, 160)).toBe("strip");
    expect(getDetailsLayout(340, 330)).toEqual({ columns: 1, maxSections: 1, itemLimit: 4 });
    expect(getDetailsLayout(520, 350)).toEqual({ columns: 2, maxSections: 2, itemLimit: 4 });
    expect(getDetailsLayout(520, 880)).toEqual({ columns: 2, maxSections: 4, itemLimit: 12 });
    expect(getDetailsLayout(1050, 700)).toEqual({ columns: 4, maxSections: 4, itemLimit: 19 });
    expect(getDetailsLayout(520, 260)).toBeNull();
  });

  test("adds job-name lines as detail panels get narrower", () => {
    expect(getJobListLayout(374, 1, 3)).toEqual({ lineClamp: 1, maxItems: 3 });
    expect(getJobListLayout(499, 2, 3)).toEqual({ lineClamp: 2, maxItems: 2 });
    expect(getJobListLayout(624, 2, 9)).toEqual({ lineClamp: 1, maxItems: 9 });
    expect(getJobListLayout(749, 4, 3)).toEqual({ lineClamp: 3, maxItems: 1 });
    expect(getJobListLayout(749, 4, 4)).toEqual({ lineClamp: 3, maxItems: 2 });
    expect(getJobListLayout(749, 4, 9)).toEqual({ lineClamp: 3, maxItems: 4 });
  });

  test("scales card and detail typography to their available width", () => {
    const compactStrip = getTypographyScale(349, 99, "strip");
    const wideStrip = getTypographyScale(800, 99, "strip");
    const compactShowcase = getTypographyScale(380, 700, "showcase");
    const wideShowcase = getTypographyScale(900, 700, "showcase");
    const shortTall = getTypographyScale(125, 250, "tall");
    const tallTall = getTypographyScale(125, 500, "tall");
    const shortWideStrip = getTypographyScale(735, 103, "strip");
    const tallWideStrip = getTypographyScale(735, 169, "strip");

    expect(wideStrip.title).toBeGreaterThan(compactStrip.title);
    expect(wideStrip.metricValue).toBeGreaterThan(compactStrip.metricValue);
    expect(wideShowcase.title).toBeGreaterThan(compactShowcase.title);
    expect(wideShowcase.metricLabel).toBeGreaterThan(compactShowcase.metricLabel);
    expect(tallTall.metricValue).toBeGreaterThan(shortTall.metricValue);
    expect(tallWideStrip.title).toBeGreaterThan(shortWideStrip.title);
    expect(tallWideStrip.metricLabel).toBeGreaterThan(shortWideStrip.metricLabel);
    expect(tallWideStrip.metricValue).toBeGreaterThan(shortWideStrip.metricValue);

    expect(getDetailsTypography(374, 2).item).toBe(11);
    expect(getDetailsTypography(624, 2).item).toBe(13);
    expect(getDetailsTypography(749, 4).item).toBe(11);
  });
});
