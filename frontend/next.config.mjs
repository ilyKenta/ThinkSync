/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
  },
}

export default nextConfig; 