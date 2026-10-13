// 临时：检查账号验证状态
import "dotenv/config";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});
await client.connect();

const users = await client.query(
  `SELECT name, email, "emailVerified", role FROM "User" ORDER BY "createdAt"`,
);
console.log(`=== 用户（${users.rows.length} 个）===`);
for (const u of users.rows) {
  const masked = String(u.email).replace(/^(.{2}).*(@.*)$/, "$1***$2");
  console.log(
    `  ${u.name} <${masked}>  已验证=${u.emailVerified ? "是 ✅" : "否"}  角色=${u.role}`,
  );
}

const tokens = await client.query(
  `SELECT purpose, "createdAt", "expiresAt", "usedAt"
   FROM "VerificationToken" ORDER BY "createdAt"`,
);
console.log(`\n=== 验证令牌（${tokens.rows.length} 条）===`);
for (const t of tokens.rows) {
  const used = t.usedAt ? "已使用 " + t.usedAt.toISOString() : "未使用";
  const expired = t.expiresAt < new Date() ? "已过期" : "有效";
  console.log(`  ${t.purpose.padEnd(15)} 创建于 ${t.createdAt.toISOString().slice(11,19)}  ${used}  ${expired}`);
}

const sess = await client.query(`SELECT COUNT(*)::int n FROM "Session"`);
console.log(`\n=== 当前登录会话：${sess.rows[0].n} 条 ===`);

await client.end();
