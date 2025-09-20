/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pg']
};

// Wrap with Sentry if available
let config = nextConfig;
try {
  const { withSentry } = require("@sentry/nextjs");
  config = withSentry(nextConfig);
} catch (error) {
  console.log("Sentry integration skipped:", error.message);
}

module.exports = config;