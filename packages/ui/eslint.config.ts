import { defineConfig } from "eslint/config";

import { baseConfig } from "@rs/eslint-config/base";
import { reactConfig } from "@rs/eslint-config/react";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
);
