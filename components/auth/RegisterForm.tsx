"use client";

import { useActionState } from "react";
import { registerAction, type AuthState } from "@/lib/actions/auth";
import { Field, SubmitButton, Alert } from "@/components/auth/AuthCard";

const initialState: AuthState = {};

export default function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="昵称"
        name="name"
        placeholder="同学们看到的名字"
        autoComplete="nickname"
        hint="2~20 个字符，以后可以改"
      />
      <Field
        label="邮箱"
        name="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        hint="用来登录，也会用来找回密码"
      />
      <Field
        label="密码"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="至少 8 位。长度比「大小写符号混搭」有用得多"
      />
      <Field
        label="确认密码"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
      />

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <SubmitButton pending={pending} pendingText="正在创建账号…">
        注册
      </SubmitButton>

      <p className="text-center text-xs leading-relaxed text-zinc-400">
        注册后会立刻登录，并给你发一封验证邮件。
        开发模式下邮件不会真的发出，而是打印在运行
        <code className="mx-1 rounded bg-zinc-100 px-1 py-0.5 text-zinc-600">
          npm run dev
        </code>
        的那个终端里。
      </p>
    </form>
  );
}
