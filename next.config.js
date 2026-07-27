/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },

  outputFileTracingIncludes: {
    "/*": ["./assets/certificates/**/*"],
  },
};

module.exports = nextConfig;
