"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// 点赞与收藏。
//
// 这两个功能看起来简单，但有一个**并发陷阱**值得知道：
//
// 如果写成「先查有没有赞过，没有就创建」，在极端情况下会出问题 ——
// 用户手抖双击，两个请求几乎同时到达，都查到「没赞过」，
// 于是都去创建，结果同一条帖子出现两条点赞记录。
//
// 我们靠什么防住它？**数据库的唯一约束**：
//   @@unique([userId, postId])
// 第二个请求插入时会直接失败，而不是写进重复数据。
//
// 但那样用户会看到报错，所以代码里用 upsert / delete 这类
// 「幂等操作」——不管执行几次，结果都一样。

export type ActionState = {
  error?: string;
  message?: string;
};

/** 点赞 / 取消点赞（点一下切换状态） */
export async function toggleLikeAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const postId = String(formData.get("postId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");

  if (!user) {
    // 未登录就什么都不做。页面上本来就不会显示按钮，
    // 但万一有人绕过界面直接提交，这里也不能出问题。
    return;
  }
  if (!postId) return;

  // 用 deleteMany 而不是「先查再删」：
  // deleteMany 在没找到记录时返回 0 而不是抛错，天然幂等。
  const deleted = await prisma.like.deleteMany({
    where: { userId: user.id, postId },
  });

  // 删掉了说明原本是「已赞」，现在变成「取消赞」；
  // 没删掉说明原本没赞，那就创建一条。
  if (deleted.count === 0) {
    try {
      await prisma.like.create({
        data: { userId: user.id, postId },
      });
    } catch {
      // 唯一约束冲突 = 已经赞过了（并发双击的情况）。
      // 这不算错误，用户想要的结果已经达成了。
    }
  }

  // 让相关页面的缓存失效，否则赞了之后数字不变
  revalidatePath(`/post/${postId}`);
  revalidatePath("/");
  if (redirectTo) revalidatePath(redirectTo);
}

/** 收藏 / 取消收藏 */
export async function toggleBookmarkAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const postId = String(formData.get("postId") ?? "");

  if (!user || !postId) return;

  const deleted = await prisma.bookmark.deleteMany({
    where: { userId: user.id, postId },
  });

  if (deleted.count === 0) {
    try {
      await prisma.bookmark.create({
        data: { userId: user.id, postId },
      });
    } catch {
      // 同上：已经收藏过了
    }
  }

  revalidatePath(`/post/${postId}`);
  revalidatePath("/bookmarks");
}

/**
 * 注意：查询逻辑（有多少赞、我赞过没有）**不放在这个文件里**。
 *
 * 因为这个文件开头有 "use server"，它会让所有导出都变成
 * 「服务端动作」—— 返回值要经过序列化，在服务端组件里当普通函数
 * 调用时拿不到结果（会得到 undefined，然后报
 * "Cannot read properties of undefined"）。
 *
 * 这是一条清晰的划分：**"use server" 文件只放写操作，
 * 读取逻辑放 lib/queries.ts。**
 */
