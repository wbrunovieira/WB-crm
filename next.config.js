/** @type {import('next').NextConfig} */
const nextConfig = {
  // Type checking is done locally via `npx tsc --noEmit` before every commit.
  // Skipping it here prevents OOM on the production build server.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

module.exports = nextConfig
