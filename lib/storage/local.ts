import { mkdir, writeFile, unlink, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { StoredFile } from "./types";
import { validateFile } from "./validate";

// 本地硬盘实现 —— 开发环境用。
//
// 优点：快、不依赖网络、不消耗云存储额度。
// 缺点：文件系统一变就没了（比如部署到 Vercel 之后）。
//
// 所以生产环境会走 supabase.ts，由 index.ts 根据环境变量自动选择。

const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

async function ensureDir(): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

/** 把「存储用的文件名」还原成绝对路径，并挡住路径穿越攻击 */
export function resolveStoredPath(storedName: string): string {
  // 关键的安全检查：如果 storedName 里含 ../ 或斜杠，攻击者就能构造出
  // storage/uploads/../../.env 这样的路径去读你的密钥文件。
  // 所以只接受「纯粹的文件名」，其余一律拒绝。
  if (
    storedName.includes("/") ||
    storedName.includes("\\") ||
    storedName.includes("..")
  ) {
    throw new Error("非法的文件名");
  }
  return path.join(UPLOAD_DIR, storedName);
}

export async function saveFile(file: File): Promise<StoredFile> {
  validateFile(file);
  await ensureDir();

  const ext = path.extname(file.name).slice(0, 12);
  const storedName = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, storedName), buffer);

  return {
    storedName,
    originalName: file.name.slice(0, 200),
    size: file.size,
    mimeType: file.type || "application/octet-stream",
  };
}

export async function readStoredFile(storedName: string): Promise<Buffer> {
  return readFile(resolveStoredPath(storedName));
}

export async function storedFileExists(storedName: string): Promise<boolean> {
  try {
    await stat(resolveStoredPath(storedName));
    return true;
  } catch {
    return false;
  }
}

export async function deleteStoredFile(storedName: string): Promise<void> {
  try {
    await unlink(resolveStoredPath(storedName));
  } catch {
    // 文件早就没了也无所谓 —— 删除应当是幂等的
  }
}
