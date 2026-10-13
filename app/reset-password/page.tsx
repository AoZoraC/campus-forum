import { Suspense } from "react";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import AuthCard, { Alert } from "@/components/auth/AuthCard";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "设置新密码 · 校园汇",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// 这里用到一个 Next.js 16 的重要写法，值得说一下：
//
// 页面读 searchParams（网址里 ?token=xxx 那部分）属于「运行时数据」——
// 它只有在用户真的发起请求时才存在。开启了 Cache Components 之后，
// 这类访问必须包在 <Suspense> 里，否则会报 blocking-route 错误。
//
// 但 searchParams 是「页面的 prop」，子组件拿不到它。所以做法是：
// 把整个 Promise 原样传下去，在 Suspense 内部再 await。
// 这样外层的标题、布局依然是静态的，能立刻显示出来。

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <>
      <SiteHeader />
      <AuthCard title="设置新密码" subtitle="设置后旧密码立即失效">
        <Suspense
          fallback={<p className="text-sm text-zinc-400">正在读取链接…</p>}
        >
          <ResetContent searchParams={searchParams} />
        </Suspense>
      </AuthCard>
    </>
  );
}

async function ResetContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  if (!token) {
    return (
      <div className="space-y-4">
        <Alert tone="error">
          这个链接不完整，缺少必要参数。请重新走一次「忘记密码」流程。
        </Alert>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
