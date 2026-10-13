// 种子数据（seed）—— 往空数据库里放「初始内容」。
//
// 为什么需要它？因为表建好之后是空的：一个板块都没有，网站首页会是一片空白。
// 这个脚本负责把那三个板块写进去。
//
// 注意它用的是 upsert（有就更新、没有就新建），所以**重复运行是安全的**，
// 不会因为跑了两遍就出现六个板块。
//
// 运行方式：npx prisma db seed

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("缺少 DATABASE_URL，请先检查项目根目录的 .env 文件。");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// 这三个板块和你当初定的一致。
// order 决定它们在左侧导航里的先后顺序。
const boards = [
  {
    slug: "study",
    name: "学习交流",
    description: "课程讨论、作业求助、老师评价",
    order: 1,
  },
  {
    slug: "resource",
    name: "资源分享",
    description: "课件、电子书、工具与网盘链接",
    order: 2,
  },
  {
    slug: "general",
    name: "综合讨论",
    description: "失物招领、社团活动、随便聊聊",
    order: 3,
  },
];

async function main() {
  console.log("开始写入板块…");

  for (const board of boards) {
    const saved = await prisma.board.upsert({
      where: { slug: board.slug },
      update: {
        name: board.name,
        description: board.description,
        order: board.order,
      },
      create: board,
    });
    console.log(`  ✓ ${saved.name}（${saved.slug}）`);
  }

  const total = await prisma.board.count();
  console.log(`完成，数据库里现在有 ${total} 个板块。`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("种子数据写入失败：", error);
    await prisma.$disconnect();
    process.exit(1);
  });
