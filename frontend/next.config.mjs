/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    // !! WARN !!
    // This will allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
}

export default nextConfig; 