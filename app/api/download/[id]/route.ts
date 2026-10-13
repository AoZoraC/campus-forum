import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readStoredFile, storedFileExists } from "@/lib/storage";

// 文件下载接口。
//
// 为什么不让文件直接放在 public/ 目录里？
// 因为那样它就变成了一个「谁都能直接打开、无法计数、无法加权限」的静态资源。
// 走这个路由之后，我们就有机会在返回文件之前做事：
//   · 统计下载次数
//   · 将来可以要求「登录才能下载」
//   · 将来可以改成只发一个临时链接（防转发）
//
// 这类路由在 Next.js 里叫 Route Handler，位置决定网址：
//   app/api/download/[id]/route.ts  →  /api/download/<附件id>

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const attachment = await prisma.attachment.findUnique({
    where: { id },
    select: {
      fileName: true,
      fileUrl: true,
      mimeType: true,
    },
  });

  if (!attachment) {
    return new NextResponse("附件不存在", { status: 404 });
  }

  // 数据库里有记录，不代表磁盘上真有文件 ——
  // 可能被人手动删了，或者（阶段 7 上线后）是因为部署换了容器。
  // 这两种情况要给出不同的提示吗？不必，对用户来说都是「文件没了」。
  if (!(await storedFileExists(attachment.fileUrl))) {
    return new NextResponse("文件已丢失", { status: 404 });
  }

  // 下载计数 +1。
  // 这里故意不 await：计数失败不该导致用户下载不了文件。
  // 用 increment 而不是「先读出来 +1 再写回去」，是因为后者在并发下会丢计数
  //（两个人同时下载，都读到 5，都写回 6，实际应该是 7）。
  prisma.attachment
    .update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    })
    .catch(() => {});

  const buffer = await readStoredFile(attachment.fileUrl);

  // 中文文件名的处理是个老坑：
  // HTTP 头里不能直接放非 ASCII 字符，所以要用 RFC 5987 规定的
  // filename*=UTF-8''<百分号编码> 形式。少了这个，中文名会变成乱码，
  // 或者干脆让整个响应头非法。
  const encodedName = encodeURIComponent(attachment.fileName);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType ?? "application/octet-stream",
      // attachment 表示「下载」而不是「在浏览器里打开」；
      // 换成 inline 的话，PDF 会直接在标签页里预览
      "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
      "Content-Length": String(buffer.length),
      // 这类内容不该被 CDN 长期缓存，否则下载计数会失真
      "Cache-Control": "private, no-store",
    },
  });
}
