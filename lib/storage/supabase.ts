import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { StoredFile } from "./types";
import { validateFile } from "./validate";

// Supabase Storage 实现 —— 生产环境用。
//
// 为什么部署后必须换掉本地硬盘？因为 Vercel 这类平台的
// **文件系统是临时的**：每次部署、每次冷启动都可能换一个容器，
// 你上传的文件就凭空消失了。而云存储是独立于服务器的，
// 服务器怎么换，文件都还在。
//
// 注意这里用的是 **service_role key**（服务端密钥）：
// 它权限很高，能绕过所有访问控制，所以**绝对不能出现在浏览器里**。
// 这个文件只会被服务端代码引用，密钥也只配在服务端环境变量里。

const BUCKET = "uploads";

/** 懒加载客户端：只在真正要读写文件时才创建，避免模块加载时就要求环境变量存在 */
function getClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 环境变量",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** 确保存储桶存在（第一次运行时自动创建） */
async function ensureBucket(supabase: SupabaseClient): Promise<void> {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    // private（不是 public）：文件不对外公开，
    // 只能通过我们的下载接口取，这样才能统计下载次数
    await supabase.storage.createBucket(BUCKET, { public: false });
  }
}

export async function saveFile(file: File): Promise<StoredFile> {
  validateFile(file);

  const ext = path.extname(file.name).slice(0, 12);
  const storedName = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";

  const supabase = getClient();
  await ensureBucket(supabase);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storedName, buffer, { contentType: mimeType, upsert: false });

  if (error) {
    throw new Error(`上传失败：${error.message}`);
  }

  return {
    storedName,
    originalName: file.name.slice(0, 200),
    size: file.size,
    mimeType,
  };
}

export async function readStoredFile(storedName: string): Promise<Buffer> {
  const supabase = getClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storedName);

  if (error || !data) {
    throw new Error(`读取文件失败：${error?.message ?? "未知错误"}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function storedFileExists(storedName: string): Promise<boolean> {
  const supabase = getClient();
  const { data, error } = await supabase.storage.from(BUCKET).list("");

  if (error) return false;
  return (data ?? []).some((item) => item.name === storedName);
}

export async function deleteStoredFile(storedName: string): Promise<void> {
  const supabase = getClient();
  // 失败也不抛错 —— 删除应当是幂等的（文件不存在也算删成功）
  await supabase.storage.from(BUCKET).remove([storedName]);
}
