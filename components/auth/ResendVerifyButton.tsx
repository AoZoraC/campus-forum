"use client";

import { useActionState } from "react";
import { resendVerifyEmailAction, type AuthState } from "@/lib/actions/auth";

// 「重新发送验证邮件」按钮。
//
// 做成客户端组件，是因为要显示「发送中 / 已发送」的即时反馈 ——
// 总不能点一下之后毫无动静，让用户怀疑到底有没有点上。

const initialState: AuthState = {};

export default function ResendVerifyButton() {
  const [state, formAction, pending] = useActionState(
    resendVerifyEmailAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "发送中…" : "重新发送验证邮件"}
      </button>

      {state.success && (
        <span className="text-xs text-green-700">
          已发送 — 打开运行 dev server 的终端查看
        </span>
      )}
      {state.error && (
        <span className="text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}
