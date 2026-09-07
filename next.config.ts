import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/admin/students',
        destination: '/admin/users?tab=student',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
