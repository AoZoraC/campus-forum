import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth";

// 顶部导航栏。
//
// 它现在有个新任务：显示「当前是谁在登录」。
// 但读取登录状态要用到 cookies()，属于运行时数据 —— 在 Cache Components
// 模式下，必须包在 <Suspense> 里。
//
// 所以这里拆成了两层：
//   · 外层的站名、搜索框是**静态**的，构建时就烘进 HTML，立刻可见
//   · 内层的 UserArea 是**动态**的，等服务器查到用户后再补上
// 用户看到的效果是：页面瞬间出现，右上角的登录状态稍晚一点点到位。

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:gap-4">
        {/* 站名 + Logo（静态） */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            汇
          </span>
          <span className="text-lg font-semibold tracking-tight text-zinc-900">
            校园汇
          </span>
        </Link>

        {/* 搜索框（静态，暂时只是样子） */}
        <div className="min-w-0 flex-1">
          <input
            type="search"
            placeholder="搜索帖子、资源、同学…"
            className="h-9 w-full max-w-md rounded-full border border-zinc-200 bg-zinc-100/70 px-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white"
          />
        </div>

        {/* 右侧：登录状态（动态） */}
        <nav className="flex shrink-0 items-center gap-2">
          <Suspense fallback={<UserAreaSkeleton />}>
            <UserArea />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

async function UserArea() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <Link
          href="/register"
          className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 sm:inline-block"
        >
          注册
        </Link>
        <Link
          href="/login"
          className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          登录
        </Link>
      </>
    );
  }

  return (
    <>
      <Link
        href="/post/new"
        className="hidden rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 sm:inline-block"
      >
        发帖
      </Link>

      <span className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-1 text-sm">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-zinc-200 text-[10px] font-medium text-zinc-600">
          {user.name.slice(0, 1)}
        </span>
        <span className="max-w-20 truncate font-medium text-zinc-700">
          {user.name}
        </span>
      </span>

      {/* 退出登录用表单提交而不是链接 —— 
          因为这属于「修改状态」的操作，用 POST 比 GET 恰当。 */}
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-full px-3 py-1.5 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
        >
          退出
        </button>
      </form>
    </>
  );
}

/** 登录状态还没查出来时占位，避免导航栏高度跳动 */
function UserAreaSkeleton() {
  return (
    <>
      <span className="hidden h-8 w-14 animate-pulse rounded-full bg-zinc-100 sm:inline-block" />
      <span className="h-8 w-20 animate-pulse rounded-full bg-zinc-100" />
    </>
  );
}
