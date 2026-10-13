import * as local from "./local";
import * as supabase from "./supabase";

// 存储层的入口 —— 根据环境变量自动选择实现。
//
// ┌─────────────────────────────────────────────────────────┐
// │  这个文件是整个「可替换设计」的收口处。                  │
// │                                                         │
// │  调用方（上传动作、下载接口）永远只写：                  │
// │      import { saveFile } from "@/lib/storage"           │
// │                                                         │
// │  它们完全不知道文件究竟存到了硬盘还是云端。             │
// │  要换存储，只改这个文件里的一个判断，业务代码一行不动。  │
// └─────────────────────────────────────────────────────────┘
//
// 判断依据：只要配了 Supabase 的两个环境变量，就走云端。
// 本地开发不配 → 走硬盘（快，且不消耗云存储额度）。
// 生产环境配上 → 走云端（否则文件会随容器消失）。

const useSupabase = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/** 当前用的是哪种存储（排查问题时很有用，会出现在日志里） */
export const storageKind: "supabase" | "local" = useSupabase
  ? "supabase"
  : "local";

export const saveFile = useSupabase ? supabase.saveFile : local.saveFile;

export const readStoredFile = useSupabase
  ? supabase.readStoredFile
  : local.readStoredFile;

export const storedFileExists = useSupabase
  ? supabase.storedFileExists
  : local.storedFileExists;

export const deleteStoredFile = useSupabase
  ? supabase.deleteStoredFile
  : local.deleteStoredFile;

// 常量与类型统一从这里导出，调用方不用关心它们定义在哪
export { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from "./types";
export type { StoredFile } from "./types";
