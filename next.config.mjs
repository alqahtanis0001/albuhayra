/**
 * Security headers are non-negotiable — see the Security section of docs/BACKEND.md.
 * Content-Security-Policy is NOT here: it carries a per-request nonce and is set
 * in src/proxy.ts. Everything below is constant, so it belongs in the config.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  // `next dev` otherwise appends a self-describing "nextjs-agent-rules" block to
  // CLAUDE.md on every start (node_modules/next/dist/server/lib/generate-agent-files.js).
  // CLAUDE.md is the project's own instruction file and is not Next.js's to edit.
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
