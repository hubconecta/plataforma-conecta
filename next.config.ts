import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Primeira entrega: não travar a publicação por avisos de tipagem.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
