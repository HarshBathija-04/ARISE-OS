/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Server Actions are enabled by default in Next 15; keep body limit generous for reports.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
