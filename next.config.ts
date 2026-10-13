import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,

  // 阶段 5 新增：附件上传要经过 Server Action，
  // 而 Next.js 默认只允许 1 MB 的请求体 —— 传个课件必然失败。
  // 这里放宽到 12 MB（比 storage.ts 里 10 MB 的单文件上限略大，
  // 留出表单其它字段的余量）。
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
