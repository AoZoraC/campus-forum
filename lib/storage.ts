import { mkdir, writeFile, unlink, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// 文件存储层 —— 把「文件到底放在哪」这件事，关在这一个文件里。
//
// 现在它把文件写到项目的 storage/uploads 目录（本地硬盘）。
// 将来要换成云存储（Cloudflare R2 / 阿里云 OSS / Supabase Storage），
// **只需要改这个文件里的三个函数**，调用它们的业务代码一行都不用动。
//
// 这就是「隔离外部依赖」的实际样子：变化被关在一个盒子里。
//
// ── 为什么不用 public/ 目录？ ──
// 放在 public/ 里的文件会被当成静态资源直接对外服务，
// 这样我们就**没法统计下载次数**，也没法在将来给「只有登录才能下载」
// 这类规则留位置。所以文件存在 public 之外，通过一个 API 路由来提供。

const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

/** 单个文件的大小上限 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/** 允许上传的文件类型。白名单比黑名单安全 —— 拦不住的格式太多，放行的才可控。 */
export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "PDF 文档",
  "application/zip": "压缩包",
  "application/x-zip-compressed": "压缩包",
  "application/msword": "Word 文档",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word 文档",
  "application/vnd.ms-excel": "Excel 表格",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel 表格",
  "application/vnd.ms-powerpoint": "PPT 演示",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPT 演示",
  "text/plain": "纯文本",
  "text/markdown": "Markdown",
  "image/jpeg": "图片",
  "image/png": "图片",
  "image/gif": "图片",
  "image/webp": "图片",
};

export type StoredFile = {
  /** 实际存在磁盘上的文件名（随机生成，用户看不到） */
  storedName: string;
  /** 原始文件名（显示给用户看） */
  originalName: string;
  size: number;
  mimeType: string;
};

/** 确保上传目录存在 */
async function ensureDir(): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

/** 把「存储用的文件名」还原成磁盘上的绝对路径，并挡住路径穿越攻击 */
export function resolveStoredPath(storedName: string): string {
  // 关键的安全检查：如果 storedName 里含有 ../ 或斜杠，
  // 攻击者就能构造出 storage/uploads/../../.env 这样的路径去读你的密钥文件。
  // 所以这里只接受「纯粹的文件名」，其余一律拒绝。
  if (storedName.includes("/") || storedName.includes("\\") || storedName.includes("..")) {
    throw new Error("非法的文件名");
  }
  return path.join(UPLOAD_DIR, storedName);
}

/**
 * 保存一个上传的文件。
 *
 * 注意这里**不信任用户给的文件名**：磁盘上一律用随机生成的 UUID 命名，
 * 原始文件名只存进数据库用于展示。这样做的原因：
 *   · 两个同学上传同名文件时不会互相覆盖
 *   · 有人上传名为 "../../.env" 的文件也毫无作用
 *   · 避免中文名在文件系统上的各种编码麻烦
 */
export async function saveFile(file: File): Promise<StoredFile> {
  if (file.size === 0) {
    throw new Error("文件是空的");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`文件不能超过 ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB`);
  }

  const mimeType = file.type || "application/octet-stream";
  if (!(mimeType in ALLOWED_MIME_TYPES)) {
    throw new Error("不支持这种文件类型，请上传文档、压缩包或图片");
  }

  await ensureDir();

  const ext = path.extname(file.name).slice(0, 12); // 保留扩展名便于用户辨认
  const storedName = `${randomUUID()}${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, storedName), buffer);

  return {
    storedName,
    originalName: file.name.slice(0, 200), // 防止超长文件名撑爆数据库
    size: file.size,
    mimeType,
  };
}

/** 读回文件内容（下载时用） */
export async function readStoredFile(storedName: string): Promise<Buffer> {
  return readFile(resolveStoredPath(storedName));
}

/** 文件是否存在 */
export async function storedFileExists(storedName: string): Promise<boolean> {
  try {
    await stat(resolveStoredPath(storedName));
    return true;
  } catch {
    return false;
  }
}

/** 删除文件。文件不存在时静默成功 —— 删除操作应当是幂等的。 */
export async function deleteStoredFile(storedName: string): Promise<void> {
  try {
    await unlink(resolveStoredPath(storedName));
  } catch {
    // 文件早就没了也无所谓
  }
}
