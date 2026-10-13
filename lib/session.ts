import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { cache } from "react";
import { prisma } from "@/lib/db";

// 登录状态是怎么「记住」的？
//
// 完整流程：
//   1. 用户在登录页输入邮箱密码，提交
//   2. 服务器验证通过后，生成一串 32 字节的随机值（token）
//   3. 把这串 token 写进浏览器的 cookie，同时在数据库 Session 表里存一行
//   4. 以后用户每次打开页面，浏览器自动带上这个 cookie
//   5. 服务器拿 cookie 里的 token 去 Session 表查 —— 查得到就说明已登录
//
// 关键点：cookie 里**只有一串随机值**，没有用户 id、没有邮箱、没有密码。
// 因为 cookie 存在用户自己的电脑上，用户可以用开发者工具随便改。
// 就算他把 token 改成别的值，那也只是换了一个「他不认识的随机串」，
// 服务器查不到对应记录，照样当没登录处理。
// 真正的身份信息始终留在服务器这边 —— 这是 Web 登录安全的地基。

const COOKIE_NAME = "campus_session";
const SESSION_DAYS = 30;

/** 生成一串密码学安全的随机 token（不是 Math.random） */
function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** 当前登录用户（已剔除敏感字段） */
export type SafeUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: Date | null;
  role: "USER" | "ADMIN";
};

/**
 * 登录成功后调用：创建会话并写入 cookie。
 * 注意：只能在 Server Action 或 Route Handler 里调用，
 * 因为只有这两处允许「修改 cookie」。
 */
export async function createSession(userId: string): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { token, userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    // httpOnly：JavaScript 读不到这个 cookie，能有效防住 XSS 偷 token
    httpOnly: true,
    // secure：只在 HTTPS 下发送。本地开发是 http，所以生产环境才开
    secure: process.env.NODE_ENV === "production",
    // sameSite: "lax"：跨站请求不带这个 cookie，能挡住大部分 CSRF 攻击
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * 读取当前登录用户，没登录返回 null。
 *
 * 用 React 的 cache() 包了一层：同一个请求里不管调用多少次，
 * 数据库只查一次。布局和页面都要用到当前用户，这个优化很实在。
 */
export const getCurrentUser = cache(async (): Promise<SafeUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt <= new Date()) {
    // 过期的会话顺手删掉，免得它一直躺在表里
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // 把密码哈希之类的字段剔除掉再往外传。
  // 这一步很重要：组件里拿到的东西越少，就越不可能不小心渲染到页面上。
  const { id, email, name, emailVerified, role } = session.user;
  return { id, email, name, emailVerified, role };
});

/** 退出登录：删掉数据库记录并清掉 cookie */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    // 用 deleteMany 而不是 delete：即使记录不存在也不会抛错
    await prisma.session.deleteMany({ where: { token } });
  }

  cookieStore.delete(COOKIE_NAME);
}

/** 清理所有已过期的会话（可以挂在定时任务里，现在先留着备用） */
export async function cleanExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  return result.count;
}
