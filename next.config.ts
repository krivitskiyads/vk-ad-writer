import type { NextConfig } from "next";

/**
 * Сборка всегда в `./.next` — так `rm -rf .next` реально сбрасывает dev-кэш.
 * Вынесенный в ~/.cache distDir давал пустые manifest при гонках записи и ломал страницы с 500.
 */
const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
