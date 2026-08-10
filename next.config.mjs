/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Supabase Storage public bucket URLs — replace project ref via env in production.
      { protocol: 'https', hostname: '*.supabase.co' }
    ]
  }
};

export default nextConfig;
