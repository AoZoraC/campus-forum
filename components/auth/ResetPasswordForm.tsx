"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction, type AuthState } from "@/lib/actions/auth";
import { Field, SubmitButton, Alert } from "@/components/auth/AuthCard";

const initialState: AuthState = {};

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    initialState,
  );

  // 重置成功后，表单就没必要继续留在页面上了 —— 引导去登录
  if (state.success) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{state.success}</Alert>
        <Link
          href="/login"
          className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-blue-700"
        >
          去登录
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* token 是从邮件链接里带过来的，用户看不见，但要跟着表单一起提交 */}
      <input type="hidden" name="token" value={token} />

      <Field
        label="新密码"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="至少 8 位"
      />
      <Field
        label="确认新密码"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
      />

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <SubmitButton pending={pending} pendingText="设置中…">
        设置新密码
      </SubmitButton>

      <p className="text-center text-xs leading-relaxed text-zinc-400">
        设置成功后，你之前在其它设备上的登录会全部失效，需要重新登录。
      </p>
    </form>
  );
}
