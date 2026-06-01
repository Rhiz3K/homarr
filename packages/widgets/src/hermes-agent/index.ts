import { IconRobot, IconServerOff } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("hermesAgent", {
  icon: IconRobot,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
  supportedIntegrations: ["hermesAgent"],
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.hermesAgent.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
