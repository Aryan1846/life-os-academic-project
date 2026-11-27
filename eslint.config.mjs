import nextConfig from "eslint-config-next";
import { globalIgnores } from "eslint/config";

const eslintConfig = [
  globalIgnores([".next-phase3-check/**", ".next-phase5-check/**", ".phase5-build/**"]),
  ...nextConfig,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
    ignores: [
      ".next/**",
      ".next-phase3-check/**",
      "node_modules/**",
      "pnpm-lock.yaml",
      "docs/**",
      "supabase/**",
    ],
  },
];

export default eslintConfig;
