import type { NextConfig } from "next";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Проект в iCloud Drive → гонки записи и compaction Turbopack в `.next`.
 * В dev кладём сборку в локальный кэш вне синхронизации; `next build` по-прежнему использует `./.next`.
 */
const devDistDir = join(homedir(), ".cache", "vk-ad-writer-next", ".next");

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "production" ? ".next" : devDistDir,
  /** Явная заготовка под Turbopack, чтобы не конфликтовало с кастомным `webpack` в Next 16. */
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
