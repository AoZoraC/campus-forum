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
