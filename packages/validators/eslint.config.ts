import { defineConfig } from "eslint/config";

import { baseConfig } from "@rs/eslint-config/base";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
);
