/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // API routes read data/ via process.cwd(), which makes tracing bundle the
    // whole folder. Raw RSS snapshots grow daily and blow the 250MB limit.
    outputFileTracingExcludes: {
      "*": ["data/source/**", "logs/**"]
    }
  },
  env: {
    NEXT_PUBLIC_SITE_URL: "https://www.trihvault.com",
    NEXT_PUBLIC_GA_ID: "G-R3VK4GWFD4"
  }
};

module.exports = nextConfig;
