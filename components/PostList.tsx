import Link from "next/link";
import { connection } from "next/server";
import { getPosts } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/format";

// 帖子列表 —— 阶段 4 起，这里的数据来自真实数据库。
//
// 有一个 Next.js 16 的细节必须处理：
//
// 我们要显示「3 小时前」这种相对时间，就必须知道「现在几点」。
// 但 Cache Components 禁止在渲染中直接调用 Date.now()，因为
// 「现在」是一个每次请求都不同的值，会破坏静态渲染的前提。
//
// 解决办法是 await connection() —— 它的意思是：
// 「这一行之后的代码必须在真实请求到达时才执行」。这样 Next.js
// 就知道这个组件不可能被提前烘成静态 HTML，也就不会报错。
//
// 顺带一提：调用它的地方必须包在 <Suspense> 里，
// 因为 connection() 会让组件「挂起」。

export default async function PostList({ boardSlug }: { boardSlug?: string }) {
  await connection(); // 声明：下面是请求时才执行的动态内容

  const posts = await getPosts({ boardSlug });

  // 上面已经 await connection()，所以这段代码只会在真实请求到达时执行，取「现在」是安全的。
  // ESLint 的 purity 规则只知道「Date.now() 每次都不同」，不认识 connection() 的作用，
  // 所以这里要手动放行 —— 这是「工具比人保守」的典型情况。
  // 注意：禁用指令必须紧贴它要作用的那一行，中间夹注释会失效。
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  // 空状态 —— 新站上线时这是最常见的样子，不能只留一片空白让人以为坏了
  if (posts.length === 0) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="text-sm text-zinc-500">
          {boardSlug && boardSlug !== "all"
            ? "这个板块还没有帖子"
            : "还没有人发过帖子"}
        </p>
        <p className="mt-1.5 text-xs text-zinc-400">
          帖子功能正在开发中，马上就能用了
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {posts.map((post) => (
        <li key={post.id}>
          <Link
            href={`/post/${post.id}`}
            className="block px-4 py-3.5 transition hover:bg-zinc-50"
          >
            <div className="flex items-start gap-4">
              {/* 左边：标题 + 元信息 */}
              <div className="min-w-0 flex-1">
                <h3 className="flex items-center gap-2 text-[15px] font-medium text-zinc-900">
                  {post.isPinned && (
                    <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-xs font-normal text-red-600">
                      置顶
                    </span>
                  )}
                  <span className="truncate">{post.title}</span>
                </h3>

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-600">
                    {post.board.name}
                  </span>
                  <span className="text-zinc-600">{post.author.name}</span>
                  <span>·</span>
                  <span>{formatRelativeTime(post.createdAt, now)}</span>
                </div>
              </div>

              {/* 右边：回复数与浏览数（手机上隐藏） */}
              <div className="hidden shrink-0 text-right text-xs leading-5 text-zinc-400 sm:block">
                <div className="font-medium text-zinc-600">
                  {post._count.comments} 回复
                </div>
                <div>{post.viewCount} 浏览</div>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
