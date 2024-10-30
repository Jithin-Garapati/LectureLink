/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['groq-sdk'], // Example of adding external packages
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
  api: {
    bodyParser: {
      sizeLimit: '300mb', // This applies globally but isn't supported in next.config, so it must be set in individual API routes.
    },
  },
};

export default nextConfig;
