"use client";

import { useActionState } from "react";
import {
  requestPasswordResetAction,
  type AuthState,
} from "@/lib/actions/auth";
import { Field, SubmitButton, Alert } from "@/components/auth/AuthCard";

const initialState: AuthState = {};

export default function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="注册时用的邮箱"
        name="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
      />

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <SubmitButton pending={pending} pendingText="发送中…">
        发送重置链接
      </SubmitButton>
    </form>
  );
}
