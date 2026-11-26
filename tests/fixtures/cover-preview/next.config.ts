import path from 'node:path';
const config = { agentRules: false, devIndicators: false, allowedDevOrigins: ["127.0.0.1"], turbopack: { root: path.resolve(process.cwd()) } };
export default config;
