"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCommentAction, type PostFormState } from "@/lib/actions/posts";
import { Alert } from "@/components/auth/AuthCard";

const initialState: PostFormState = {};

export default function CommentForm({ postId }: { postId: string }) {
  const [state, formAction, pending] = useActionState(
    createCommentAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // 提交成功后清空输入框。
  //
  // 判断「这次是不是刚提交完」有个小技巧：不能只看 state，
  // 因为初始状态和成功状态都是空对象。所以这里盯着 pending 的变化 ——
  // 「上一刻还在提交中、这一刻不在提交中、且没有报错」= 刚刚成功了。
  //
  // 这里用 useRef 而不是 useState 记录「上一次的 pending」：
  // ref 变化不会触发重新渲染，而我们要的只是「在 effect 里读一下上次的值」，
  // 不需要界面跟着变。（ESLint 的 react-hooks/set-state-in-effect 规则
  // 会拦住 useEffect 里直接 setState 的写法 —— 那是真的会多渲染一次。）
  const wasPendingRef = useRef(false);
  useEffect(() => {
    if (wasPendingRef.current && !pending && !state.error) {
      formRef.current?.reset();
    }
    wasPendingRef.current = pending;
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="postId" value={postId} />

      <textarea
        name="content"
        required
        rows={4}
        placeholder="说点什么…"
        className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "发送中…" : "发表回复"}
      </button>
    </form>
  );
}
