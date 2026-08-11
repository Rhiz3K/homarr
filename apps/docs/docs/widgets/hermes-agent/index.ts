import type { WidgetDefinition } from "@site/src/types";
import { IconRobot } from "@tabler/icons-react";

export const hermesAgentWidget: WidgetDefinition = {
  icon: IconRobot,
  name: "Hermes Agent",
  description: "Responsive Hermes Agent gateway, activity, automation, and update overview.",
  path: "/docs/widgets/hermes-agent",
  configuration: {
    items: [
      {
        name: "Hermes brand theme",
        description: "Use the Hermes teal appearance instead of following the board theme.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show platforms",
        description: "Show connected messaging platforms when detail access is allowed.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show recent sessions",
        description: "Show recent agent sessions when detail access is allowed.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show scheduled jobs",
        description: "Show scheduled and paused jobs when detail access is allowed.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show toolsets",
        description: "Show enabled toolsets when detail access is allowed.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
