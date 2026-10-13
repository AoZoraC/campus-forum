import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import AuthCard from "@/components/auth/AuthCard";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "找回密码 · 校园汇",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <SiteHeader />
      <AuthCard
        title="忘记密码"
        subtitle="填写注册时用的邮箱，我们会给你发一条重置链接"
        footer={
          <Link href="/login" className="hover:text-blue-600">
            ← 返回登录
          </Link>
        }
      >
        <ForgotPasswordForm />
      </AuthCard>
    </>
  );
}
