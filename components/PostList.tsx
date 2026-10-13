import { boards, posts } from "@/lib/mock-data";

// 帖子列表。
//
// 这里有个小技巧值得学：先把板块数组转成一张「对照表」（Map），
// 这样每条帖子查自己的板块名时是一次查找，而不是每次都把数组从头扫一遍。
// 现在数据才 10 条，差别看不出来；等有 10 万条帖子，这就是天壤之别。

export default function PostList() {
  const boardNameBySlug = new Map(boards.map((board) => [board.slug, board.name]));

  return (
    <ul className="divide-y divide-zinc-100">
      {posts.map((post) => (
        <li
          key={post.id}
          className="group px-4 py-3.5 transition hover:bg-zinc-50"
        >
          <div className="flex items-start gap-4">
            {/* 左边：标题、摘要、作者信息 */}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[15px] font-medium text-zinc-900 group-hover:text-blue-600">
                {post.title}
              </h3>

              <p className="mt-1 truncate text-sm text-zinc-500">
                {post.excerpt}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-600">
                  {boardNameBySlug.get(post.boardSlug) ?? "未知板块"}
                </span>
                <span className="text-zinc-600">{post.author}</span>
                <span>·</span>
                <span>{post.createdAt}</span>
              </div>
            </div>

            {/* 右边：回复数和浏览数（手机上隐藏，屏幕太窄放不下） */}
            <div className="hidden shrink-0 text-right text-xs leading-5 text-zinc-400 sm:block">
              <div className="font-medium text-zinc-600">
                {post.replyCount} 回复
              </div>
              <div>{post.viewCount} 浏览</div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
