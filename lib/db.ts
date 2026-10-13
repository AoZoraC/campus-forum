import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

// 数据库连接的唯一入口。
//
// 页面和接口都不直接 new PrismaClient，而是从这里 import ——
// 好处是「连数据库」这件事只有一处配置，将来换数据库、加日志、调连接池，
// 都只改这一个文件。
//
// ── 为什么要搞个单例，而不是到处 new？ ──
// 开发模式下，Next.js 每改动一次文件就会热更新、重新执行模块代码。
// 如果每次执行都 new 一个 PrismaClient，数据库连接会越堆越多，
// 几十次改动之后就会把连接数上限撑爆，报「too many connections」。
// 把实例挂到 globalThis 上，热更新时复用它，就没事了。
// 这是 Next.js + Prisma 的标准写法。

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  // 运行时用「连接池」地址（见 .env 里的说明）。
  // 这里显式检查而不是直接传，是为了在忘记配 .env 时
  // 给出一个人能看懂的报错，而不是一堆底层驱动的英文错误。
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "缺少 DATABASE_URL 环境变量。请检查项目根目录的 .env 文件是否填好了数据库地址。",
    );
  }

  // Prisma 7 起，连数据库的活儿交给专门的 JavaScript 驱动（这里是 pg），
  // Prisma 自己只负责类型和查询翻译。
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
