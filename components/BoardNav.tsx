import Link from "next/link";
import { getBoards } from "@/lib/queries";

// 左侧板块导航。
//
// 阶段 4 的变化：板块不再写死在代码里，而是**从数据库读**。
// 这意味着以后想加一个「社团活动」板块，只要往数据库里插一行，
// 导航栏自动就多一项 —— 不用改代码、不用重新部署。
//
// 注意这个组件现在是 async 的（要等数据库返回），
// 所以调用它的地方必须包在 <Suspense> 里。

export default async function BoardNav({
  activeSlug = "all",
}: {
  activeSlug?: string;
}) {
  const boards = await getBoards();

  const itemClass = (active: boolean) =>
    "block rounded-lg px-3 py-2 text-sm transition " +
    (active
      ? "bg-blue-50 font-medium text-blue-700"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900");

  return (
    <nav className="hidden w-44 shrink-0 md:block">
      <h2 className="px-3 pb-2 text-xs font-medium tracking-wide text-zinc-400">
        板块
      </h2>

      <ul className="space-y-0.5">
        {/* 「全部」是虚拟的 —— 它不是数据库里的一条记录，只是「不筛选」的意思 */}
        <li>
          <Link href="/" className={itemClass(activeSlug === "all")}>
            全部
          </Link>
        </li>

        {boards.map((board) => (
          <li key={board.id}>
            <Link
              href={`/?board=${board.slug}`}
              title={board.description}
              className={itemClass(board.slug === activeSlug)}
            >
              {board.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
