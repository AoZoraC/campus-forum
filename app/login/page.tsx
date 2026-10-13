import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import AuthCard from "@/components/auth/AuthCard";
import LoginForm from "@/components/auth/LoginForm";

// 在 Next.js 里，这个文件的位置就决定了它的网址：
//   app/login/page.tsx  →  /login
// 一行路由配置都不用写。

export const metadata: Metadata = {
  title: "登录 · 校园汇",
};

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <AuthCard
        title="登录校园汇"
        subtitle="用注册时的邮箱和密码登录"
        footer={
          <>
            还没有账号？{" "}
            <Link
              href="/register"
              className="font-medium text-blue-600 hover:underline"
            >
              注册一个
            </Link>
          </>
        }
      >
        <LoginForm />
      </AuthCard>
    </>
  );
}
