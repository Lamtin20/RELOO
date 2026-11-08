import {SECURITY_HEADERS} from './lib/security/web-policy.js';
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages:['@electric-sql/pglite'],
  distDir:process.env.NODE_ENV==='development'&&process.env.RELOO_STAYS_TEST_MODE==='1'?'.next-stays-test':process.env.NODE_ENV==='development'&&process.env.RELOO_ANALYTICS_TEST_MODE==='1'?'.next-analytics-test':process.env.NODE_ENV==='development'&&process.env.RELOO_CARE_TEST_MODE==='1'?'.next-care-test':process.env.NODE_ENV==='development'&&process.env.RELOO_NEIGHBORHOOD_TEST_MODE==='1'?'.next-neighborhood-test':'.next',
  poweredByHeader:false,
  logging:{incomingRequests:{ignore:[/^\/api\/rental-care\/google\/callback/] }},
  async headers(){return [{source:'/:path*',headers:SECURITY_HEADERS}];},
  async rewrites() {
    return { beforeFiles: [{ source: "/", has: [{ type: "host", value: "crm.reloo.vn" }], destination: "/crm" }] };
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.reloo.vn" }],
        destination: "https://reloo.vn/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
