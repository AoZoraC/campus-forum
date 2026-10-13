"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthState } from "@/lib/actions/auth";
import { Field, SubmitButton, Alert } from "@/components/auth/AuthCard";

// 为什么这个文件开头有 "use client"？
//
// 因为它用到了 useActionState —— 这是个「状态钩子」，
// 需要在浏览器里维护「表单正在提交吗」「上次报了什么错」这些状态。
// 服务端组件不能有状态，所以这种地方必须标成客户端组件。
//
// 但请注意：标了 "use client" **不代表逻辑跑在浏览器里**。
// loginAction 仍然是彻头彻尾的服务端函数，密码校验和数据库操作
// 都发生在服务器上，浏览器只是负责把表单数据发过去。

const initialState: AuthState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="邮箱"
        name="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
      />
      <Field
        label="密码"
        name="password"
        type="password"
        autoComplete="current-password"
      />

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <SubmitButton pending={pending} pendingText="登录中…">
        登录
      </SubmitButton>

      <div className="text-center text-sm">
        <Link
          href="/forgot-password"
          className="text-zinc-500 hover:text-blue-600"
        >
          忘记密码？
        </Link>
      </div>
    </form>
  );
}
