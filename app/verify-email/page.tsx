import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import AuthCard, { Alert } from "@/components/auth/AuthCard";
import { verifyEmailAction } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "邮箱验证 · 校园汇",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// 说明一个取舍：这个页面在「渲染时」直接执行验证，属于带副作用的 GET。
// 严格的 REST 规范会说 GET 不该改数据（因为邮件服务商可能预取链接）。
// 但绝大多数网站的验证/退订链接都这么做，因为体验最好 ——
// 你想想要是点开邮件还要再点一次按钮，多烦。
// 这里的副作用是幂等的（重复验证不会出问题），所以可以接受。

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <>
      <SiteHeader />
      <AuthCard title="邮箱验证">
        <Suspense
          fallback={<p className="text-sm text-zinc-400">正在验证…</p>}
        >
          <VerifyContent searchParams={searchParams} />
        </Suspense>
      </AuthCard>
    </>
  );
}

async function VerifyContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  if (!token) {
    return <Alert tone="error">这个链接不完整，缺少验证参数。</Alert>;
  }

  const result = await verifyEmailAction(token);

  if (result.error) {
    return (
      <div className="space-y-4">
        <Alert tone="error">{result.error}</Alert>
        <p className="text-sm leading-relaxed text-zinc-500">
          验证链接的有效期是 1 小时，而且只能用一次。
          你可以登录之后，在页面上重新获取一封。
        </p>
        <Link
          href="/"
          className="block w-full rounded-lg border border-zinc-200 px-4 py-2 text-center text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          回到首页
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert tone="success">{result.success}</Alert>
      <p className="text-sm leading-relaxed text-zinc-500">
        邮箱验证完成。以后如果忘记密码，就能通过这个邮箱找回了。
      </p>
      <Link
        href="/"
        className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-blue-700"
      >
        开始逛逛
      </Link>
    </div>
  );
}
