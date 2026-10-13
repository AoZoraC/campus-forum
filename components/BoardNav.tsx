import Link from "next/link";
import { boards } from "@/lib/mock-data";

// 左侧板块导航。
//
// activeSlug 表示「当前选中的是哪个板块」。阶段 1 里首页永远传 "all"，
// 所以点了别的板块也不会有任何变化 —— 因为还没有真正的筛选逻辑。
// 阶段 2 会从网址（?board=study）里读真实值，那时点击才会真的切换。

export default function BoardNav({
  activeSlug = "all",
}: {
  activeSlug?: string;
}) {
  return (
    <nav className="hidden w-44 shrink-0 md:block">
      <h2 className="px-3 pb-2 text-xs font-medium tracking-wide text-zinc-400">
        板块
      </h2>

      <ul className="space-y-0.5">
        {boards.map((board) => {
          const isActive = board.slug === activeSlug;
          return (
            <li key={board.slug}>
              <Link
                href={board.slug === "all" ? "/" : `/?board=${board.slug}`}
                title={board.description}
                className={
                  "block rounded-lg px-3 py-2 text-sm transition " +
                  (isActive
                    ? "bg-blue-50 font-medium text-blue-700"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900")
                }
              >
                {board.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
