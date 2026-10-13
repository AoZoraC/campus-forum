import { Suspense } from "react";
import BoardNav from "@/components/BoardNav";
import PostList from "@/components/PostList";
import SiteHeader from "@/components/SiteHeader";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";

// 首页 —— 浏览器打开 http://localhost:3000 时看到的就是它。
//
// 在 Next.js 里，文件夹的位置就是网址：
//   app/page.tsx           ->  /
//   app/login/page.tsx     ->  /login
//   app/post/[id]/page.tsx ->  /post/123
//
// ── 阶段 4 的重要变化 ──
//
// 这个页面现在**整页都是「外壳」**：标题、布局、背景立刻就能显示，
// 而需要查数据库的部分（板块列表、帖子列表）分别包在 <Suspense> 里，
// 等数据回来了再补上。
//
// 为什么非得这样拆？因为 Next.js 16 默认开启 Cache Components：
// 静态外壳会被烘成 HTML 从 CDN 秒发，动态内容在请求时才填补。
// 如果直接在这里 await 数据库，整页就得等查询完成才能显示 —— 慢得多。
//
// 另外注意：这个页面本身**不是 async 的**，它只是把 searchParams
// 这个 Promise 原样传下去，让子组件在自己的 Suspense 边界内 await。

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <>
      <SiteHeader />

      {/* 邮箱未验证时的黄色提示条 */}
      <Suspense fallback={null}>
        <VerifyEmailBanner />
      </Suspense>

      {/* 手机上是竖着排（板块条在上方），宽屏是横着排（板块在左侧）。
          一个 flex-col md:flex-row 就够 —— 不需要写两套布局。 */}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:gap-6 md:py-6">
        {/* 板块导航（读数据库） */}
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarSection searchParams={searchParams} />
        </Suspense>

        {/* 主区域：帖子列表（读数据库） */}
        <main className="min-w-0 flex-1">
          <Suspense fallback={<PostListSkeleton />}>
            <PostListSection searchParams={searchParams} />
          </Suspense>
        </main>
      </div>
    </>
  );
}

/** 从网址里取出当前板块（例如 /?board=study），没指定就是「全部」 */
async function readBoardSlug(searchParams: SearchParams): Promise<string> {
  const params = await searchParams;
  return typeof params.board === "string" && params.board ? params.board : "all";
}

async function SidebarSection({ searchParams }: { searchParams: SearchParams }) {
  const boardSlug = await readBoardSlug(searchParams);
  return <BoardNav activeSlug={boardSlug} />;
}

async function PostListSection({ searchParams }: { searchParams: SearchParams }) {
  const boardSlug = await readBoardSlug(searchParams);

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <h1 className="text-sm font-semibold text-zinc-800">
          {boardSlug === "all" ? "最新帖子" : "板块帖子"}
        </h1>
      </div>
      <PostList boardSlug={boardSlug} />
    </section>
  );
}

// ── 骨架屏 ──
// 数据没回来时先占住位置，避免内容突然出现导致页面「跳一下」。
// 这比转圈图标体验好，因为它让人感觉「东西已经在路上了」。

function SidebarSkeleton() {
  return (
    <>
      {/* 手机版的骨架：一排胶囊 */}
      <div className="flex gap-2 md:hidden">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-zinc-200"
          />
        ))}
      </div>
      {/* 宽屏版的骨架：一列方块 */}
      <div className="hidden w-44 shrink-0 md:block">
        <div className="mb-3 h-3 w-10 animate-pulse rounded bg-zinc-200" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="mb-1 h-9 animate-pulse rounded-lg bg-zinc-100" />
        ))}
      </div>
    </>
  );
}

function PostListSkeleton() {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-4 py-3">
        <div className="h-4 w-20 animate-pulse rounded bg-zinc-200" />
      </div>
      <div className="divide-y divide-zinc-100">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="px-4 py-3.5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
            <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </section>
  );
}
