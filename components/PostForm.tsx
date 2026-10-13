"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createPostAction, type PostFormState } from "@/lib/actions/posts";
import { Alert } from "@/components/auth/AuthCard";

type Board = { id: string; slug: string; name: string; description: string };

const initialState: PostFormState = {};

export default function PostForm({
  boards,
  defaultBoardSlug,
}: {
  boards: Board[];
  defaultBoardSlug?: string;
}) {
  const [state, formAction, pending] = useActionState(
    createPostAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      {/* 板块选择 */}
      <div>
        <label
          htmlFor="boardSlug"
          className="block text-sm font-medium text-zinc-700"
        >
          发到哪个板块
        </label>
        <select
          id="boardSlug"
          name="boardSlug"
          defaultValue={defaultBoardSlug ?? boards[0]?.slug}
          className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {boards.map((board) => (
            <option key={board.id} value={board.slug}>
              {board.name} —— {board.description}
            </option>
          ))}
        </select>
      </div>

      {/* 标题 */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-zinc-700"
        >
          标题
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={100}
          placeholder="一句话说清你想问什么、分享什么"
          className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <p className="mt-1 text-xs text-zinc-400">4~100 个字</p>
      </div>

      {/* 正文 */}
      <div>
        <label
          htmlFor="content"
          className="block text-sm font-medium text-zinc-700"
        >
          正文
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={14}
          placeholder={"把情况写清楚一点，别人更好帮你。\n\n比如：哪个课、哪一章、你试过什么、卡在哪一步。"}
          className="mt-1.5 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <p className="mt-1 text-xs text-zinc-400">
          暂时只支持纯文本，排版功能后面再加
        </p>
      </div>

      {/* 附件 */}
      <div>
        <label
          htmlFor="files"
          className="block text-sm font-medium text-zinc-700"
        >
          附件（可选）
        </label>
        <input
          id="files"
          name="files"
          type="file"
          multiple
          accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp"
          className="mt-1.5 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-600 file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-sm file:text-zinc-700 file:transition hover:file:bg-zinc-200"
        />
        <p className="mt-1 text-xs text-zinc-400">
          单个文件不超过 10 MB。支持 PDF、压缩包、Office 文档、图片
        </p>
      </div>

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "发布中…" : "发布"}
        </button>
        <Link
          href="/"
          className="rounded-lg px-4 py-2 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
        >
          取消
        </Link>
      </div>
    </form>
  );
}
