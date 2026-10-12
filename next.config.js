/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },

  outputFileTracingIncludes: {
    "/*": [
      "./assets/certificates/**/*",
      "./templates/mou/lia-mou-automation-template.docx",
    ],
  },
};

module.exports = nextConfig;
