/** 存储层对外返回的文件信息 */
export type StoredFile = {
  /** 实际存起来的标识（本地是文件名，云端是对象路径），用户看不到 */
  storedName: string;
  /** 原始文件名（显示给用户看） */
  originalName: string;
  size: number;
  mimeType: string;
};

/** 单个文件的大小上限 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * 允许上传的文件类型。
 *
 * 白名单比黑名单安全 —— 你永远列不完「所有危险的格式」，
 * 但可以明确列出「我们要放行的几种」。
 */
export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "PDF 文档",
  "application/zip": "压缩包",
  "application/x-zip-compressed": "压缩包",
  "application/msword": "Word 文档",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word 文档",
  "application/vnd.ms-excel": "Excel 表格",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "Excel 表格",
  "application/vnd.ms-powerpoint": "PPT 演示",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PPT 演示",
  "text/plain": "纯文本",
  "text/markdown": "Markdown",
  "image/jpeg": "图片",
  "image/png": "图片",
  "image/gif": "图片",
  "image/webp": "图片",
};
