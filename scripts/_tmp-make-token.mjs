// 临时：造一个测试账号 + 未过期的验证令牌，用来端到端验证「点链接验证邮箱」这条流程
import "dotenv/config";
import pg from "pg";
import crypto from "node:crypto";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});
await client.connect();

// 先清掉上一次可能残留的测试数据
await client.query(`DELETE FROM "User" WHERE email = 'verify-test@example.com'`);

const userId = "test-user-" + Date.now();
const token = crypto.randomBytes(32).toString("base64url");

await client.query(
  `INSERT INTO "User" (id, email, name, "passwordHash", "updatedAt")
   VALUES ($1, $2, $3, $4, NOW())`,
  [userId, "verify-test@example.com", "验证流程测试", "$2b$12$fakehashfakehashfakehash"],
);

await client.query(
  `INSERT INTO "VerificationToken" (id, token, "userId", purpose, "expiresAt")
   VALUES ($1, $2, $3, 'EMAIL_VERIFY', NOW() + INTERVAL '1 hour')`,
  ["vt-" + Date.now(), token, userId],
);

console.log("已创建测试账号和令牌");
console.log("TOKEN:" + token);
console.log("USERID:" + userId);

await client.end();
