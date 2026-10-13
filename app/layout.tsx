import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// 根布局：所有页面都会被包在这里面，相当于整个网站的「外壳」。
// 这里只放全站通用的东西：语言、标题、背景色。
//
// 小知识：create-next-app 默认把顶部导航栏放在这里，我故意没这么做 ——
// 因为导航栏现在只有首页用，等页面多起来（详情页、登录页）再考虑上移到这里。

export const metadata: Metadata = {
  title: "校园汇 · 学习与资源分享",
  description: "校级学习交流与资源分享论坛",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-zinc-100 text-zinc-900">
        {children}
      </body>
    </html>
  );
}
