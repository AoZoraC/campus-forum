"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, checkPasswordStrength } from "@/lib/password";
import { createSession, destroySession, getCurrentUser } from "@/lib/session";
import { sendMail, siteUrl } from "@/lib/mail";

// 这个文件里全是「服务端动作」（Server Action）。
//
// 它和普通函数的区别很重要：这些函数**只在服务器上运行**。
// 页面里的表单可以直接把它们当作 action 提交，浏览器不会、
// 也拿不到它们的源码。所以密码校验、数据库操作放在这里才是安全的。
//
// 第一行的 "use server" 就是给整个文件打的标记。

/** 表单处理的结果，用来把错误信息传回页面显示 */
export type AuthState = {
  error?: string;
  success?: string;
};

// ─────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────

/** 生成一串密码学安全的随机 token */
function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** 生成邮箱验证 / 重置密码用的一次性令牌，有效期 1 小时 */
async function issueToken(
  userId: string,
  purpose: "EMAIL_VERIFY" | "PASSWORD_RESET",
): Promise<string> {
  const token = generateToken();
  await prisma.verificationToken.create({
    data: {
      token,
      userId,
      purpose,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return token;
}

/**
 * 校验一次性令牌。
 * 返回 null 表示无效（不存在 / 用过了 / 过期了 / 用途不对）。
 */
async function consumeToken(
  token: string,
  purpose: "EMAIL_VERIFY" | "PASSWORD_RESET",
) {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record) return null;
  if (record.purpose !== purpose) return null;
  if (record.usedAt) return null; // 已经用过，不能再用
  if (record.expiresAt <= new Date()) return null;

  return record;
}

/** 极简邮箱格式检查（真正的验证靠那封验证邮件，不靠正则） */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ─────────────────────────────────────────────────────────
// 注册
// ─────────────────────────────────────────────────────────
export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  // ── 1. 逐项校验，每次只报一个问题，别让用户猜 ──
  if (!looksLikeEmail(email)) {
    return { error: "请输入有效的邮箱地址" };
  }
  if (name.length < 2 || name.length > 20) {
    return { error: "昵称需要 2~20 个字符" };
  }
  if (password !== confirm) {
    return { error: "两次输入的密码不一致" };
  }
  const strength = checkPasswordStrength(password);
  if (!strength.ok) {
    return { error: strength.message };
  }

  // ── 2. 邮箱是否已被注册 ──
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // 这里其实泄露了「该邮箱已注册」这一信息。
    // 对校内论坛来说这是可接受的取舍 —— 如果连这都不说，
    // 用户遇到「注册没反应」会完全摸不着头脑。
    return { error: "这个邮箱已经注册过了，直接登录吧" };
  }

  // ── 3. 创建用户（密码只以哈希形式落库）──
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
    },
  });

  // ── 4. 发验证邮件（开发模式下打印在终端里）──
  const token = await issueToken(user.id, "EMAIL_VERIFY");
  const verifyLink = siteUrl(`/verify-email?token=${token}`);

  await sendMail({
    to: email,
    subject: "【校园汇】请验证你的邮箱",
    text: `你好 ${name}：\n\n感谢注册校园汇。请点击下面的链接完成邮箱验证：\n\n${verifyLink}\n\n这个链接 1 小时内有效，且只能使用一次。\n如果不是你本人操作，忽略这封邮件即可。`,
  });

  // ── 5. 直接登录（注册完还要再登录一次很烦人）──
  await createSession(user.id);

  // redirect 会抛出特殊异常来跳转，必须放在最后
  redirect("/?welcome=1");
}

// ─────────────────────────────────────────────────────────
// 登录
// ─────────────────────────────────────────────────────────
export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "请填写邮箱和密码" };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // 注意这里的设计：无论「邮箱不存在」还是「密码错误」，
  // 都返回同一句话。如果区分开来，攻击者就能拿一份邮箱列表
  // 逐个试，从而判断出「哪些邮箱在你们站注册过」（这叫用户枚举）。
  if (!user) {
    return { error: "邮箱或密码不正确" };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { error: "邮箱或密码不正确" };
  }

  await createSession(user.id);
  redirect("/");
}

// ─────────────────────────────────────────────────────────
// 退出登录
// ─────────────────────────────────────────────────────────
export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

// ─────────────────────────────────────────────────────────
// 验证邮箱
// ─────────────────────────────────────────────────────────
export async function verifyEmailAction(token: string): Promise<AuthState> {
  const record = await consumeToken(token, "EMAIL_VERIFY");
  if (!record) {
    return { error: "这个验证链接无效、已过期，或者已经用过了" };
  }

  // 两个动作必须一起完成，所以用事务包起来：
  // 标记令牌已用 + 给用户盖上验证时间
  await prisma.$transaction([
    prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
  ]);

  return { success: "邮箱验证成功！" };
}

/** 重新发送验证邮件（用户可能没收到，或者链接过期了） */
export async function resendVerifyEmailAction(
  _prev: AuthState,
  _formData: FormData,
): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };
  if (user.emailVerified) return { success: "你的邮箱已经验证过了" };

  const token = await issueToken(user.id, "EMAIL_VERIFY");
  await sendMail({
    to: user.email,
    subject: "【校园汇】请验证你的邮箱",
    text: `你好 ${user.name}：\n\n请点击下面的链接完成邮箱验证：\n\n${siteUrl(`/verify-email?token=${token}`)}\n\n这个链接 1 小时内有效。`,
  });

  return { success: "验证邮件已重新发送（开发模式下请看终端）" };
}

// ─────────────────────────────────────────────────────────
// 忘记密码 → 发重置链接
// ─────────────────────────────────────────────────────────
export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!looksLikeEmail(email)) {
    return { error: "请输入有效的邮箱地址" };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // 这里和登录相反：**即使邮箱不存在，也返回成功**。
  // 因为「这个邮箱注册过没有」本身就是隐私。所以我们统一说
  // 「如果该邮箱存在，我们已经发了邮件」。
  if (user) {
    const token = await issueToken(user.id, "PASSWORD_RESET");
    await sendMail({
      to: email,
      subject: "【校园汇】重置你的密码",
      text: `你好 ${user.name}：\n\n有人请求重置这个账号的密码。如果是你本人，请点击：\n\n${siteUrl(`/reset-password?token=${token}`)}\n\n链接 1 小时内有效，只能使用一次。\n如果不是你操作的，忽略这封邮件即可，你的密码不会改变。`,
    });
  }

  return {
    success: "如果该邮箱已注册，我们已发送重置链接（开发模式下请看终端）",
  };
}

// ─────────────────────────────────────────────────────────
// 用令牌设置新密码
// ─────────────────────────────────────────────────────────
export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (password !== confirm) {
    return { error: "两次输入的密码不一致" };
  }
  const strength = checkPasswordStrength(password);
  if (!strength.ok) {
    return { error: strength.message };
  }

  const record = await consumeToken(token, "PASSWORD_RESET");
  if (!record) {
    return { error: "这个重置链接无效、已过期，或者已经用过了" };
  }

  await prisma.$transaction([
    prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    // 密码改了，把该用户所有已登录的会话全部踢掉 ——
    // 这是安全惯例：万一账号是被盗后找回的，旧会话必须失效。
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  return { success: "密码已重置，请用新密码登录" };
}
