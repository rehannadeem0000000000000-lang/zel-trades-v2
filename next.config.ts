import type { NextConfig } from "next";

// APK_BUILD=1 produces a fully static export (out/) that Capacitor wraps into the Android app.
// The normal build keeps the Node server so the API health route and Postgres stay available.
const isApkBuild = process.env.APK_BUILD === "1";

const nextConfig: NextConfig = {
  ...(isApkBuild ? { output: "export" as const, images: { unoptimized: true } } : {}),
};

export default nextConfig;
