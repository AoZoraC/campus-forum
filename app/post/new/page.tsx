import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import PostForm from "@/components/PostForm";
import { getBoards } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "发表新帖 · 校园汇",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// 发帖页面。
//
// 这里体现了一个重要原则：**「登录才能发帖」的检查必须在服务端做。**
//
// 顶栏在没有登录时不显示「发帖」按钮，那只是体验优化；
// 但如果有人直接在地址栏输入 /post/new，一样能打开这个页面。
// 所以真正的拦截在这里 —— 没登录就跳去登录页。
//
// 而且这只是第一道。即使页面拦住了，lib/actions/posts.ts 里的
// createPostAction 还会再检查一次。**两道防线不是冗余**：
// 页面拦住的是「普通用户误入」，动作里的检查拦住的是「有人绕开页面直接提交」。

export default function NewPostPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <>
      <SiteHeader />

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <Suspense
          fallback={
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <div className="h-6 w-24 animate-pulse rounded bg-zinc-100" />
              <div className="mt-6 space-y-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-lg bg-zinc-100"
                  />
                ))}
              </div>
            </div>
          }
        >
          <NewPostContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function NewPostContent({ searchParams }: { searchParams: SearchParams }) {
  // 第一道防线：没登录直接跳走
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const boards = await getBoards();

  const defaultBoardSlug =
    typeof params.board === "string" ? params.board : undefined;

  if (boards.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <p className="text-sm text-zinc-500">
          数据库里还没有任何板块，无法发帖
        </p>
        <p className="mt-1.5 text-xs text-zinc-400">
          请先运行 npx prisma db seed
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
        发表新帖
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        以 <span className="font-medium text-zinc-700">{user.name}</span>{" "}
        的身份发布
      </p>

      <div className="mt-6">
        <PostForm boards={boards} defaultBoardSlug={defaultBoardSlug} />
      </div>
    </div>
  );
}
