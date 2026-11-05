/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Phaser touches `window`, so it is only ever imported client-side via
  // dynamic import (ssr:false). No special webpack config needed for v1.
  experimental: {
    // Disable the dev-tools "segment explorer" overlay. In Next 15.5.x it can
    // crash RSC rendering with: Could not find the module
    // "next-devtools/.../segment-explorer-node.js#SegmentViewNode" in the React
    // Client Manifest. Turning it off avoids the issue entirely.
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
