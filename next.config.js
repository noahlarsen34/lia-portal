/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },

  outputFileTracingIncludes: {
    "/*": ["./assets/certificates/**/*"],
  },
};

module.exports = nextConfig;
