/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Reasonable limit for Vercel
    },
    responseLimit: false,
  },
  webpack: (config) => {
    config.externals = [...config.externals, 'mock-aws-s3', 'nock'];
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      'fs': false,
      'path': false,
    };
    // Configure webpack to load FFmpeg core files
    config.module.rules.push({
      test: /ffmpeg-core\.js$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/chunks/ffmpeg-core.js'
      }
    });
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
