import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".agents/skills/impeccable/scripts/**", "**/.next/**", "out/**", "build/**", "dist/**", "coverage/**", "**/*.min.js", "next-env.d.ts"]),
]);
