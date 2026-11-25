/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const nextConfig = {
  reactStrictMode: true,
  // Production builds are a fully static export (served as plain files from
  // the CDN). This avoids Vercel ISR reads / Fast Origin Transfer entirely,
  // which is what exhausted the Hobby plan limits.
  output: isDev ? undefined : "export",
  // The review console (/review + /api/review/*) writes to data/ on disk, so it
  // only works locally. Its files use the `.dev.ts(x)` suffix and are only
  // picked up by `next dev`.
  pageExtensions: isDev ? ["dev.tsx", "dev.ts", "tsx", "ts"] : ["tsx", "ts"],
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
