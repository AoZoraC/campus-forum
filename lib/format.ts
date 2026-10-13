/**
 * 把时间显示成「刚刚 / 5 分钟前 / 3 小时前 / 2 天前」这种人话。
 *
 * 为什么要把「现在」当作参数传进来，而不是在函数里直接调 Date.now()？
 *
 * 因为 Next.js 16 的 Cache Components 有个约束：
 * **渲染过程中调用 Date.now()、Math.random() 这类「每次都不一样」的东西会直接报错**
 * （错误类型叫 blocking-prerender-current-time）。
 * 原因很简单：如果页面在构建时就被烘成静态 HTML，
 * 那「现在」到底是哪一刻？没法确定。
 *
 * 所以这里把它做成一个「纯函数」—— 输入什么，输出就一定是什么。
 * 至于是谁、什么时候提供这个「现在」，由调用它的组件决定。
 */
export function formatRelativeTime(date: Date, now: number): string {
  const diffMs = now - date.getTime();

  // 时钟误差或者未来时间，一律显示「刚刚」
  if (diffMs < 60_000) return "刚刚";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} 分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;

  return `${Math.floor(months / 12)} 年前`;
}

/** 把字节数显示成 1.2 MB / 340 KB 这种形式（阶段 5 上传附件时会用到） */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
