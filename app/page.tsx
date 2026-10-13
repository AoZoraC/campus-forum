import { Suspense } from "react";
import BoardNav from "@/components/BoardNav";
import PostList from "@/components/PostList";
import SiteHeader from "@/components/SiteHeader";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { posts } from "@/lib/mock-data";

// 首页 —— 浏览器打开 http://localhost:3000 时看到的就是它。
//
// 在 Next.js 里，文件夹的位置就是网址：
//   app/page.tsx           ->  /
//   app/login/page.tsx     ->  /login
//   app/post/[id]/page.tsx ->  /post/123  （阶段 4 会做帖子详情页）
//
// ⚠️ 注意：目前帖子列表用的还是 lib/mock-data.ts 里的假数据。
//    阶段 4 会把它换成从数据库读（用 lib/queries.ts），
//    届时这里的 <PostList /> 会包进 <Suspense> —— 因为查数据库属于动态内容。

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      {/* 邮箱未验证时的黄色提示条。
          它要读登录状态（cookies），属于运行时数据，所以必须包在 Suspense 里。
          fallback 给 null：没登录的人根本不会看到这一条，不必占位。 */}
      <Suspense fallback={null}>
        <VerifyEmailBanner />
      </Suspense>

      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6">
        {/* 左边栏：板块导航 */}
        <BoardNav activeSlug="all" />

        {/* 主区域：帖子列表 */}
        <main className="min-w-0 flex-1">
          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <h1 className="text-sm font-semibold text-zinc-800">最新帖子</h1>
              <span className="text-xs text-zinc-400">共 {posts.length} 条</span>
            </div>

            <PostList />
          </section>

          <p className="mt-4 text-center text-xs text-zinc-400">
            以上内容全部是假数据，只用来先确定页面的样子。
          </p>
        </main>
      </div>
    </>
  );
}
