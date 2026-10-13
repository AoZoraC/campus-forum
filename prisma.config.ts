// Prisma 的配置文件（Prisma 7 新增，取代了以前写在 schema.prisma 里的连接地址）
//
// 这个文件只被「命令行工具」使用 —— 也就是你敲 npx prisma xxx 的时候。
// 网站真正跑起来之后连数据库，用的是 lib/db.ts 里配置的 driver adapter。
//
// 两者用的地址不同，这是故意的：
//   这里（CLI / 迁移）用 DIRECT_URL —— 直连地址，因为它能干「建表」这种活
//   lib/db.ts（运行时）用 DATABASE_URL —— 连接池地址，因为它扛得住并发

import "dotenv/config"; // 让这个文件能读到 .env 里的变量（Prisma 7 不再自动读了）
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    // 运行 npx prisma db seed 时执行的脚本（往空数据库里放初始板块）
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    // 这里刻意用 process.env 而不是官方的 env() 助手，原因值得记住：
    // env() 在变量缺失时会直接抛错，而它是在「加载配置文件」时执行的 ——
    // 也就是说哪怕你只是跑 prisma generate（根本不需要数据库），
    // 只要 .env 没配好，它也会失败。官方文档专门提醒了这个坑。
    // 用 process.env 加上空字符串兜底，就只有一个命令真需要地址时才报错。
    url: process.env.DIRECT_URL ?? "",
  },
});
