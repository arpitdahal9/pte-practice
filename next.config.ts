import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Local `next dev` gets Wrangler bindings (including D1) via this hook.
initOpenNextCloudflareForDev();
