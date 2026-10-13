import Link from "next/link";
import { getBoards } from "@/lib/queries";

// 板块导航。
//
// ── 阶段 6 的移动端改造 ──
//
// 原来它是 `hidden md:block` —— 意思是手机用户**根本看不到板块导航**。
// 而同学多半用手机访问，这等于让半个网站的人没法切换板块。
//
// 现在改成两套呈现，同一份数据：
//   · 手机上：横向滚动的胶囊条（占一行，左右滑动）
//   · 宽屏上：左侧竖直列表（原来那个）
//
// 为什么不共用一套？因为这两种形态的布局逻辑完全不同 ——
// 硬凑成一套只会两边都别扭。数据只有一个来源（数据库），
// 呈现方式根据屏幕决定，这是响应式设计的正常做法。

export default async function BoardNav({
  activeSlug = "all",
}: {
  activeSlug?: string;
}) {
  const boards = await getBoards();

  // 全部板块 = 「全部」+ 数据库里的
  const items = [
    { slug: "all", name: "全部", description: "所有板块的最新帖子" },
    ...boards.map((b) => ({
      slug: b.slug,
      name: b.name,
      description: b.description,
    })),
  ];

  const href = (slug: string) => (slug === "all" ? "/" : `/?board=${slug}`);

  return (
    <>
      {/* ── 手机：横向滚动的胶囊条 ── */}
      <nav className="md:hidden">
        <ul className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => {
            const active = item.slug === activeSlug;
            return (
              <li key={item.slug} className="shrink-0">
                <Link
                  href={href(item.slug)}
                  className={
                    "block whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition " +
                    (active
                      ? "border-blue-200 bg-blue-50 font-medium text-blue-700"
                      : "border-zinc-200 bg-white text-zinc-600")
                  }
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── 宽屏：左侧竖直列表 ── */}
      <nav className="hidden w-44 shrink-0 md:block">
        <h2 className="px-3 pb-2 text-xs font-medium tracking-wide text-zinc-400">
          板块
        </h2>
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = item.slug === activeSlug;
            return (
              <li key={item.slug}>
                <Link
                  href={href(item.slug)}
                  title={item.description}
                  className={
                    "block rounded-lg px-3 py-2 text-sm transition " +
                    (active
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900")
                  }
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
