import path from "node:path";
const config = {
  agentRules: false, devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: { root: path.resolve(process.cwd()) },
  // The real SDK is used, but every request is intercepted by Playwright.
  env: { NEXT_PUBLIC_SUPABASE_URL: "https://forms.supabase.invalid", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture-only-key" },
};
export default config;
