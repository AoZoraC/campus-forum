import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import CommentForm from "@/components/CommentForm";
import { getPostById } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { deleteAttachmentFormAction } from "@/lib/actions/attachments";
import { formatRelativeTime, formatFileSize } from "@/lib/format";

type Params = Promise<{ id: string }>;

// 帖子详情页。
//
// 网址里的 [id] 是「动态路由段」—— 文件夹叫 [id]，
// 那么 /post/abc123 这样的网址都会落到这个页面，
// 而 abc123 可以通过 params.id 拿到。
//
// 注意 params 在 Next.js 16 里是个 Promise，必须 await。

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostById(id);
  return { title: post ? `${post.title} · 校园汇` : "帖子不存在 · 校园汇" };
}

export default function PostPage({ params }: { params: Params }) {
  return (
    <>
      <SiteHeader />

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <Suspense fallback={<PostSkeleton />}>
          <PostContent params={params} />
        </Suspense>
      </div>
    </>
  );
}

async function PostContent({ params }: { params: Params }) {
  // 要显示「3 小时前」，必须先声明这里只能在真实请求时执行
  await connection();

  const { id } = await params;
  const post = await getPostById(id);

  // 帖子不存在（或者 id 是乱填的）→ 交给 Next.js 渲染 404 页面
  if (!post) notFound();

  const user = await getCurrentUser();

  // 同上：已经 await connection() 了，这里取「现在」是安全的。
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  // 顶层回复和楼中楼分开：先按时间排好顶层，再把子回复挂到各自父级下面
  const topLevel = post.comments.filter((c) => !c.parentId);
  const repliesOf = (parentId: string) =>
    post.comments.filter((c) => c.parentId === parentId);

  return (
    <>
      {/* ── 帖子主体 ── */}
      <article className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-4">
          <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
            <Link
              href={`/?board=${post.board.slug}`}
              className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-600 transition hover:bg-zinc-200"
            >
              {post.board.name}
            </Link>
            {post.isPinned && (
              <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-600">
                置顶
              </span>
            )}
            {post.isLocked && (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                已锁定
              </span>
            )}
          </div>

          <h1 className="text-xl font-semibold leading-snug tracking-tight text-zinc-900">
            {post.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-zinc-400">
            <span className="font-medium text-zinc-600">
              {post.author.name}
            </span>
            <span>·</span>
            <span>{formatRelativeTime(post.createdAt, now)}</span>
            <span>·</span>
            <span>{post.viewCount} 浏览</span>
          </div>
        </div>

        {/* 正文：whitespace-pre-wrap 让用户输入的换行和空格原样显示 */}
        <div className="whitespace-pre-wrap px-5 py-5 text-[15px] leading-7 text-zinc-800">
          {post.content}
        </div>

        {/* 附件（阶段 5 才会有内容） */}
        {post.attachments.length > 0 && (
          <div className="border-t border-zinc-100 px-5 py-4">
            <h2 className="mb-2 text-xs font-medium text-zinc-400">附件</h2>
            <ul className="space-y-2">
              {post.attachments.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1"
                >
                  {/* 链接指向下载接口而不是文件本身 ——
                      这样才能统计下载次数，将来也才能加权限控制 */}
                  <a
                    href={`/api/download/${a.id}`}
                    className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-blue-600 hover:underline"
                  >
                    <span className="truncate">{a.fileName}</span>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {formatFileSize(a.fileSize)}
                      {a.downloadCount > 0 && ` · 已下载 ${a.downloadCount} 次`}
                    </span>
                  </a>

                  {/* 只有作者本人或管理员能看到删除按钮。
                      注意这只是「界面上不显示」，真正的权限判断在
                      lib/actions/attachments.ts 里 —— 有人绕过界面
                      直接构造请求，也删不掉别人的附件。 */}
                  {user &&
                    (user.id === post.author.id || user.role === "ADMIN") && (
                      <form action={deleteAttachmentFormAction}>
                        <input
                          type="hidden"
                          name="attachmentId"
                          value={a.id}
                        />
                        <input type="hidden" name="postId" value={post.id} />
                        <button
                          type="submit"
                          className="text-xs text-zinc-400 transition hover:text-red-600"
                        >
                          删除
                        </button>
                      </form>
                    )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      {/* ── 回复区 ── */}
      <section className="mt-4 rounded-xl border border-zinc-200 bg-white">
        <h2 className="border-b border-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-800">
          回复 {post.comments.length > 0 && `(${post.comments.length})`}
        </h2>

        {post.comments.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-400">
            还没有人回复，来说第一句吧
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {topLevel.map((comment) => (
              <li key={comment.id} className="px-5 py-4">
                <CommentBody comment={comment} now={now} />

                {/* 楼中楼 */}
                {repliesOf(comment.id).length > 0 && (
                  <ul className="mt-3 space-y-3 border-l-2 border-zinc-100 pl-4">
                    {repliesOf(comment.id).map((reply) => (
                      <li key={reply.id}>
                        <CommentBody comment={reply} now={now} compact />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 回复输入区 ── */}
      <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5">
        {post.isLocked ? (
          <p className="text-center text-sm text-zinc-400">
            这个帖子已被锁定，不能再回复
          </p>
        ) : user ? (
          <CommentForm postId={post.id} />
        ) : (
          <p className="text-center text-sm text-zinc-500">
            <Link href="/login" className="text-blue-600 hover:underline">
              登录
            </Link>{" "}
            之后才能回复
          </p>
        )}
      </section>
    </>
  );
}

/** 一条回复的显示（顶层和楼中楼共用） */
function CommentBody({
  comment,
  now,
  compact = false,
}: {
  comment: { content: string; createdAt: Date; author: { name: string } };
  now: number;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-xs text-zinc-400">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-zinc-200 text-[10px] font-medium text-zinc-600">
          {comment.author.name.slice(0, 1)}
        </span>
        <span className="font-medium text-zinc-600">{comment.author.name}</span>
        <span>·</span>
        <span>{formatRelativeTime(comment.createdAt, now)}</span>
      </div>
      <p
        className={
          "whitespace-pre-wrap leading-relaxed text-zinc-800 " +
          (compact ? "text-sm" : "text-[15px]")
        }
      >
        {comment.content}
      </p>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="h-4 w-16 animate-pulse rounded bg-zinc-100" />
        <div className="mt-3 h-7 w-3/4 animate-pulse rounded bg-zinc-100" />
        <div className="mt-3 h-3 w-40 animate-pulse rounded bg-zinc-100" />
        <div className="mt-6 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-zinc-100"
              style={{ width: `${90 - i * 12}%` }}
            />
          ))}
        </div>
      </div>
      <div className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-white" />
    </div>
  );
}
