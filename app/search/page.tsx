import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import { searchPosts } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "搜索 · 校园汇",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// 搜索结果页 —— 网址形如 /search?q=离散数学
//
// 这里把 searchParams 的 Promise 传进 Suspense 内部再 await，
// 和之前几个页面是同一个套路：让「外壳」能立刻显示，
// 只有真正依赖查询结果的部分才等待。

export default function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <>
      <SiteHeader />

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <Suspense fallback={<SearchSkeleton />}>
          <SearchResults searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  // 要显示「3 小时前」，所以声明这是请求时执行的动态内容
  await connection();

  const params = await searchParams;
  const keyword = typeof params.q === "string" ? params.q.trim() : "";

  if (!keyword) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-6 py-16 text-center">
        <p className="text-sm text-zinc-500">在上面的搜索框里输入关键词</p>
        <p className="mt-1.5 text-xs text-zinc-400">
          会同时搜索帖子的标题和正文
        </p>
      </div>
    );
  }

  const results = await searchPosts(keyword);

  // 上面已经 await connection()，这里取「现在」是安全的。
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-sm text-zinc-600">
          搜索「<span className="font-medium text-zinc-900">{keyword}</span>」
        </h1>
        <span className="text-xs text-zinc-400">找到 {results.length} 条</span>
      </div>

      {results.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-16 text-center">
          <p className="text-sm text-zinc-500">没有找到相关的帖子</p>
          <p className="mt-1.5 text-xs text-zinc-400">
            换个关键词试试，或者去发一条新帖问问
          </p>
          <Link
            href="/post/new"
            className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            去发帖
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {results.map((post) => (
            <li key={post.id}>
              <Link
                href={`/post/${post.id}`}
                className="block px-4 py-3.5 transition hover:bg-zinc-50"
              >
                <h2 className="truncate text-[15px] font-medium text-zinc-900">
                  {post.title}
                </h2>
                {/* 摘要：把正文截一段，帮用户判断是不是自己想找的 */}
                <p className="mt-1 truncate text-sm text-zinc-500">
                  {post.content.slice(0, 80)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-600">
                    {post.board.name}
                  </span>
                  <span className="text-zinc-600">{post.author.name}</span>
                  <span>·</span>
                  <span>{formatRelativeTime(post.createdAt, now)}</span>
                  <span>·</span>
                  <span>{post._count.comments} 回复</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function SearchSkeleton() {
  return (
    <div>
      <div className="mb-4 h-4 w-40 animate-pulse rounded bg-zinc-200" />
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border-b border-zinc-100 px-4 py-3.5 last:border-0">
            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-zinc-100" />
            <div className="mt-2 h-3 w-1/4 animate-pulse rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
