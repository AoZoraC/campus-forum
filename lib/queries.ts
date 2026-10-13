import { prisma } from "@/lib/db";

// 数据查询层 —— 页面和数据库之间的唯一通道。
//
// 为什么要把查询集中在这里，而不是散落在各个页面里？三个理由：
//   1. 页面只关心「显示什么」，不关心「怎么查出来的」
//   2. 同一个查询往往被多个页面用到（首页、板块页、搜索结果、个人主页）
//   3. 将来要加缓存、要优化 SQL、要改字段，只动这一个文件
//
// 这里的函数全是 async —— 因为要等数据库返回。

/** 取出所有板块，按设定的顺序排列 */
export async function getBoards() {
  return prisma.board.findMany({
    orderBy: { order: "asc" },
  });
}

/**
 * 帖子列表。
 *
 * 注意用的是 select 而不是 include —— 两者都能带出关联数据，
 * 但 select 允许你**精确指定要哪些字段**。比如这里完全不需要
 * 把每条帖子的完整正文（content）拉到列表页来，那是详情页才要的。
 * 数据量一大，少拉一个字段就是少传几百 KB。
 */
export async function getPosts(options?: {
  boardSlug?: string;
  limit?: number;
}) {
  const { boardSlug, limit = 20 } = options ?? {};

  return prisma.post.findMany({
    where:
      boardSlug && boardSlug !== "all"
        ? { board: { slug: boardSlug } }
        : undefined,
    // 置顶的排最前，其余的按发布时间倒序
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      createdAt: true,
      viewCount: true,
      isPinned: true,
      board: { select: { name: true, slug: true } },
      author: { select: { name: true } },
      // _count 让 Prisma 顺便把「有几条回复」也算出来，
      // 不用为每条帖子单独再查一次（那样 20 条帖子就要查 21 次）
      _count: { select: { comments: true } },
    },
  });
}

/** 某个板块下有多少条帖子（列表页顶部的「共 N 条」用） */
export async function countPosts(boardSlug?: string) {
  return prisma.post.count({
    where:
      boardSlug && boardSlug !== "all"
        ? { board: { slug: boardSlug } }
        : undefined,
  });
}

/**
 * 搜索帖子（标题和正文都搜）。
 *
 * 两个细节值得注意：
 *
 * 1. `mode: "insensitive"` 让搜索不区分大小写。
 *    在 PostgreSQL 上这会生成 ILIKE 查询，所以搜 "python" 能匹配到 "Python"。
 *
 * 2. 这里用的是 `contains`，也就是**子串匹配**（相当于 SQL 的 LIKE '%关键词%'）。
 *    它简单、够用，但有个局限：搜「数学 复习」这种多个词的时候，
 *    它会把这一整串当成一个词去找，而不是找同时含这两个词的结果。
 *    真要做得更好的话，需要 PostgreSQL 的全文检索（to_tsvector），
 *    那是后面有余力再做的事。**先有可用的，再谈更好的。**
 */
export async function searchPosts(keyword: string, limit = 50) {
  const q = keyword.trim();
  if (!q) return [];

  return prisma.post.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      viewCount: true,
      isPinned: true,
      board: { select: { name: true, slug: true } },
      author: { select: { name: true } },
      _count: { select: { comments: true } },
    },
  });
}

/** 单个帖子的详情（含作者、板块、附件、回复） */
export async function getPostById(id: string) {
  return prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      viewCount: true,
      isPinned: true,
      isLocked: true,
      board: { select: { name: true, slug: true } },
      author: { select: { id: true, name: true } },
      attachments: {
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          downloadCount: true,
        },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          createdAt: true,
          parentId: true,
          author: { select: { id: true, name: true } },
        },
      },
    },
  });
}

/** 把帖子类型导出成别名，方便页面组件复用（不用自己再写一遍类型） */
export type PostListItem = Awaited<ReturnType<typeof getPosts>>[number];
export type BoardItem = Awaited<ReturnType<typeof getBoards>>[number];

// ─────────────────────────────────────────────────────────
// 点赞相关的查询
//
// 这些函数**必须放在这里**，而不能放进 lib/actions/likes.ts。
// 原因：那个文件开头有 "use server"，里面所有导出都会变成
// 「服务端动作」，返回值要经过序列化 —— 在服务端组件里
// 当普通函数调用时会拿到 undefined。
//
// 划分原则：**写操作放 actions，读操作放 queries。**
// ─────────────────────────────────────────────────────────

/** 某条帖子的点赞数 + 当前用户赞过没有 */
export async function getLikeInfo(postId: string, userId?: string) {
  const [count, mine] = await Promise.all([
    prisma.like.count({ where: { postId } }),
    userId
      ? prisma.like.findUnique({
          where: { userId_postId: { userId, postId } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  return { count, likedByMe: Boolean(mine) };
}

/**
 * 批量取多条帖子的点赞数（列表页用）。
 *
 * 为什么不循环调用 getLikeInfo？因为那样 20 条帖子要查 20 次数据库。
 * 用 groupBy 一次查完，这在列表页是必须的 ——
 * 单次查询快，二十次串起来就是肉眼可见的卡顿。
 */
export async function getLikeCounts(
  postIds: string[],
): Promise<Record<string, number>> {
  if (postIds.length === 0) return {};

  const rows = await prisma.like.groupBy({
    by: ["postId"],
    where: { postId: { in: postIds } },
    _count: { _all: true },
  });

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.postId] = row._count._all;
  }
  return result;
}

/** 当前用户收藏的帖子（个人主页/收藏页用） */
export async function getBookmarkedPosts(userId: string) {
  const rows = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      post: {
        select: {
          id: true,
          title: true,
          createdAt: true,
          board: { select: { name: true, slug: true } },
          author: { select: { name: true } },
          _count: { select: { comments: true, likes: true } },
        },
      },
    },
  });

  return rows.map((r) => ({ ...r.post, bookmarkedAt: r.createdAt }));
}
