import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@compras-rd/db", "@compras-rd/ui", "@compras-rd/ocds"],
};

export default nextConfig;
