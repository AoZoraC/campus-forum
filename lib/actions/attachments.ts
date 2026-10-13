"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { saveFile, deleteStoredFile } from "@/lib/storage";

// 附件的上传与删除。
//
// 上传这件事最容易被忽视的地方是：**你永远不能相信用户提交上来的文件名**。
// 磁盘上用什么名字存、原始名字怎么展示，是两件必须分开的事。
// 具体原因见 lib/storage.ts 里的注释。

export type AttachmentState = {
  error?: string;
};

/**
 * 保存一批上传的文件，并把它们关联到指定帖子。
 * 由发帖动作在创建帖子之后调用。
 */
export async function attachFilesToPost(
  postId: string,
  files: File[],
): Promise<AttachmentState> {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  // 确认这个帖子确实存在、而且确实是这个人发的 ——
  // 否则有人能拿别人的帖子 id，往人家帖子下面挂文件
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  if (!post) return { error: "帖子不存在" };
  if (post.authorId !== user.id) return { error: "你只能给自己的帖子添加附件" };

  for (const file of files) {
    try {
      const stored = await saveFile(file);
      await prisma.attachment.create({
        data: {
          fileName: stored.originalName,
          fileUrl: stored.storedName, // 存的是「磁盘上的随机名」，不是完整路径
          fileSize: stored.size,
          mimeType: stored.mimeType,
          postId,
        },
      });
    } catch (error) {
      // 单个文件失败不影响其它的 —— 用户可能一次选了五个，
      // 其中一个超限，不该导致整批都白传
      const message = error instanceof Error ? error.message : "上传失败";
      return { error: `「${file.name}」上传失败：${message}` };
    }
  }

  return {};
}

/** 删除一个附件（只有上传者本人或管理员可以） */
export async function deleteAttachmentAction(
  attachmentId: string,
): Promise<AttachmentState> {  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    select: { fileUrl: true, post: { select: { authorId: true } } },
  });
  if (!attachment) return { error: "附件不存在" };

  const isOwner = attachment.post.authorId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return { error: "你没有权限删除这个附件" };
  }

  // 先删数据库记录，再删磁盘文件。
  //
  // 顺序很重要：如果反过来（先删文件、再删记录），
  // 万一步骤二失败了，数据库里就会留下一条「指向不存在文件」的记录，
  // 用户点下载会得到 404，而你还以为文件还在。
  // 反过来失败的话，最坏只是磁盘上多一个没人引用的文件 —— 无害，且可以定期清理。
  await prisma.attachment.delete({ where: { id: attachmentId } });
  await deleteStoredFile(attachment.fileUrl);

  return {};
}

/**
 * 供表单直接调用的包装。
 *
 * 为什么要多这一层？因为普通函数和「表单动作」的签名不一样：
 *   · 前者收具体参数，比如 deleteAttachmentAction(id)
 *   · 后者必须收 FormData，因为浏览器提交表单时就是这个格式
 *
 * 这层包装做两件事：从表单里取出 id，提交完成后让页面缓存失效 ——
 * 不做第二步的话，你删完附件刷新页面会发现它还在（读的是缓存）。
 */
export async function deleteAttachmentFormAction(
  formData: FormData,
): Promise<void> {
  const attachmentId = String(formData.get("attachmentId") ?? "");
  const postId = String(formData.get("postId") ?? "");

  await deleteAttachmentAction(attachmentId);

  if (postId) {
    revalidatePath(`/post/${postId}`);
  }
}
