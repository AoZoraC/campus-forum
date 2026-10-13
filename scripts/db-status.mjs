#!/usr/bin/env node
// 查看数据库当前状态
//
// 用途：不打开 Prisma Studio 也能快速确认「表建好没、板块写进去没」。
// 它用 Node 的 pg 驱动直连数据库（和网站运行时用的是同一条链路）。
//
// 用法：node scripts/db-status.mjs

import "dotenv/config";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("缺少 DATABASE_URL，请检查 .env。");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  // Supabase 要求 SSL；它的证书链在 Node 里默认校验不过，所以这里放宽。
  // 这只影响「连接加密的校验方式」，不影响数据本身。
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("已连接到数据库\n");

  // 1. 有哪些表
  const tables = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  const names = tables.rows.map((r) => r.tablename);
  console.log(`【表】共 ${names.length} 张`);
  for (const n of names) console.log(`   · ${n}`);

  // 2. 每张表有多少行
  console.log("\n【行数】");
  for (const n of names) {
    try {
      const c = await client.query(`SELECT COUNT(*)::int AS c FROM "${n}"`);
      console.log(`   ${String(c.rows[0].c).padStart(6)}  ${n}`);
    } catch {
      console.log(`        ?  ${n}（读不到）`);
    }
  }

  // 3. 板块内容（如果有）
  if (names.includes("Board")) {
    const boards = await client.query(
      `SELECT slug, name, "order" FROM "Board" ORDER BY "order"`,
    );
    console.log(`\n【板块】共 ${boards.rows.length} 个`);
    for (const b of boards.rows) {
      console.log(`   ${b.order}. ${b.name}  (${b.slug})`);
    }
    if (boards.rows.length === 0) {
      console.log("   （空的 —— 说明还没跑 npx prisma db seed）");
    }
  }

  console.log("\n数据库状态检查完成 ✅");
} catch (error) {
  console.error("连接或查询失败：", error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
