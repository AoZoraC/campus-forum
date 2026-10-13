import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import AuthCard from "@/components/auth/AuthCard";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "注册 · 校园汇",
};

export default function RegisterPage() {
  return (
    <>
      <SiteHeader />
      <AuthCard
        title="加入校园汇"
        subtitle="注册后就能发帖、回复、分享资源"
        footer={
          <>
            已经有账号了？{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:underline"
            >
              去登录
            </Link>
          </>
        }
      >
        <RegisterForm />
      </AuthCard>
    </>
  );
}
