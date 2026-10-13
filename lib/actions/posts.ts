"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { attachFilesToPost } from "@/lib/actions/attachments";

// 发帖与回帖的服务端动作。
//
// 这个文件里有个新的重要概念：**每个写操作都必须先确认「你是谁」**。
//
// 页面上的「登录才能看到发帖按钮」只是体验，不是安全措施 ——
// 任何人都能绕过界面直接构造一个请求。所以真正的检查必须放在
// 服务端动作里，这是唯一用户改不了的地方。

export type PostFormState = {
  error?: string;
};

// ─────────────────────────────────────────────────────────
// 发帖
// ─────────────────────────────────────────────────────────
export async function createPostAction(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  // ① 权限检查：没登录就没得商量
  const user = await getCurrentUser();
  if (!user) {
    return { error: "请先登录再发帖" };
  }

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const boardSlug = String(formData.get("boardSlug") ?? "").trim();

  // ② 内容校验。服务端的校验永远不能省 ——
  //    前端的 required、maxLength 之类只是「帮用户少犯错」，
  //    绕过它们太容易了。
  if (title.length < 4) {
    return { error: "标题至少需要 4 个字" };
  }
  if (title.length > 100) {
    return { error: "标题不能超过 100 个字" };
  }
  if (content.length === 0) {
    return { error: "正文不能为空" };
  }
  if (content.length > 20000) {
    return { error: "正文太长了（上限 2 万字）" };
  }

  // ③ 板块必须真实存在。用户可能构造一个不存在的 slug 提交过来，
  //    如果直接用它去写数据库，外键约束会报错、用户只会看到一片红。
  const board = await prisma.board.findUnique({
    where: { slug: boardSlug },
    select: { id: true },
  });
  if (!board) {
    return { error: "请选择一个有效的板块" };
  }

  // ④ 写库
  const post = await prisma.post.create({
    data: {
      title,
      content,
      boardId: board.id,
      authorId: user.id,
    },
    select: { id: true },
  });

  // ④.5 处理附件（阶段 5 新增）
  //
  // 注意这里的取舍：**帖子已经创建成功了，附件失败不回滚。**
  // 原因是「发帖」和「传文件」是两件事，帖子本身是有效的。
  // 如果因为一个文件超限就把整篇帖子撤掉，用户会很恼火
  //（而且他还得重新写一遍正文）。所以附件出问题就跳过，
  // 帖子照常发出去。
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length > 0) {
    const result = await attachFilesToPost(post.id, files);
    if (result.error) {
      // 这里没有把它返回给用户 —— 因为帖子已经建好了，
      // 返回错误会让表单以为整次提交失败。真正的做法应该是
      // 在帖子页面上提示「附件上传失败」，那是阶段 6 的体验优化。
      console.error("[发帖] 附件上传失败：", result.error);
    }
  }

  // ⑤ 让缓存失效，否则你发完帖回到首页会看不到它
  //    （首页的帖子列表是动态的，但路由级缓存仍然需要主动刷新）
  revalidatePath("/");
  revalidatePath(`/?board=${boardSlug}`);

  // ⑥ 跳到新帖子的页面
  redirect(`/post/${post.id}`);
}

// ─────────────────────────────────────────────────────────
// 回帖
// ─────────────────────────────────────────────────────────
export async function createCommentAction(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "请先登录再回复" };
  }

  const postId = String(formData.get("postId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim() || null;

  if (content.length === 0) {
    return { error: "回复不能为空" };
  }
  if (content.length > 5000) {
    return { error: "回复太长了（上限 5000 字）" };
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, isLocked: true },
  });
  if (!post) {
    return { error: "这个帖子不存在" };
  }
  if (post.isLocked) {
    return { error: "这个帖子已被锁定，不能再回复" };
  }

  // 楼中楼：如果指定了父回复，要确认它确实属于这个帖子 ——
  // 否则有人可以拿 A 帖子的回复 id 去 B 帖子底下「接」一条，
  // 数据就串了。
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { postId: true },
    });
    if (!parent || parent.postId !== postId) {
      return { error: "找不到要回复的那条内容" };
    }
  }

  await prisma.comment.create({
    data: {
      content,
      postId,
      authorId: user.id,
      parentId,
    },
  });

  // 帖子详情页的缓存要失效，否则新回复不会出现
  revalidatePath(`/post/${postId}`);
  return {};
}

// ─────────────────────────────────────────────────────────
// 删除自己的帖子
//
// 注意权限判断的顺序：**先确认这条数据存在，再确认它是不是你的。**
// 如果反过来（先查「我发的帖子」再删），那删除别人的帖子时
// 会静默失败 —— 用户以为删掉了，其实没有。
// ─────────────────────────────────────────────────────────
export async function deletePostAction(postId: string): Promise<PostFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  if (!post) return { error: "这个帖子不存在" };

  const isOwner = post.authorId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { error: "你只能删除自己发的帖子" };
  }

  // 级联删除会自动清掉这条帖子的所有回复和附件
  //（因为 schema 里外键写的是 onDelete: Cascade）
  await prisma.post.delete({ where: { id: postId } });

  revalidatePath("/");
  redirect("/");
}
