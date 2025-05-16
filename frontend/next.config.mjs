/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // !! WARN !!
    // This will allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Configure external domains for image optimization
  images: {
    domains: ['localhost', 'thinksyncapi.azurewebsites.net'],
    unoptimized: true, // This ensures images are served as-is in production
  },
  // Ensure public directory is included in the build
  experimental: {
    outputFileTracingRoot: undefined,
  },
}

export default nextConfig; 