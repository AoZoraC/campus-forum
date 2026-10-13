import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from "./types";

// 上传前的校验 —— 两种存储实现共用。
//
// 抽出来的好处：不管文件最终存到硬盘还是云端，
// 「大小和类型」这两道关都必然被执行，不会因为换了存储就漏掉。

export function validateFile(file: File): void {
  if (file.size === 0) {
    throw new Error("文件是空的");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `文件不能超过 ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB`,
    );
  }
  const mimeType = file.type || "application/octet-stream";
  if (!(mimeType in ALLOWED_MIME_TYPES)) {
    throw new Error("不支持这种文件类型，请上传文档、压缩包或图片");
  }
}
