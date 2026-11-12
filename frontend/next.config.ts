import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  poweredByHeader: false,
  images: { unoptimized: true },
  allowedDevOrigins: ["192.168.0.233"],
};

export default config;
