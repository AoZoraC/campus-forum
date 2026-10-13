#!/usr/bin/env node
// 部署前自检 —— 在跑 `vercel` 或点 Deploy 之前执行一次。
//
// 它检查的都是「部署后才会暴露、但本地就能提前发现」的问题：
//   · 环境变量漏配（最容易犯，且症状最难懂）
//   · 数据库连不上
//   · 存储配置不完整（部分配了比完全没配还糟）
//   · 有未提交的代码（部署会漏掉）
//
// 用法：node scripts/preflight.mjs

import "dotenv/config";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import pg from "pg";

let problems = 0;
let warnings = 0;

const OK = "  [通过]";
const BAD = "  [问题]";
const WARN = "  [注意]";

function problem(msg) {
  console.log(`${BAD} ${msg}`);
  problems++;
}
function warn(msg) {
  console.log(`${WARN} ${msg}`);
  warnings++;
}
function ok(msg) {
  console.log(`${OK} ${msg}`);
}

console.log("校园汇 · 部署前自检");
console.log("=".repeat(56));

// ── 1. 环境变量 ──────────────────────────────────────────
console.log("\n【1. 环境变量】");

const required = [
  ["DATABASE_URL", "数据库连接池地址"],
  ["DIRECT_URL", "数据库直连地址（迁移用）"],
];
const storageKeys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

for (const [key, desc] of required) {
  const v = process.env[key];
  if (!v) {
    problem(`${key} 没配置（${desc}）`);
  } else if (!/^postgres(ql)?:\/\//.test(v)) {
    problem(`${key} 格式不对，应该以 postgresql:// 开头`);
  } else {
    ok(`${key} 已配置`);
  }
}

const storageConfigured = storageKeys.filter((k) => process.env[k]);
if (storageConfigured.length === 0) {
  warn(
    "没配 Supabase 存储 —— 本地开发没问题，但**部署后上传的文件会随容器消失**",
  );
} else if (storageConfigured.length < 2) {
  problem(
    `存储配置不完整：${storageConfigured.join(", ")} 配了，但缺 ${storageKeys
      .filter((k) => !process.env[k])
      .join(", ")}。只配一半会让上传直接报错。`,
  );
} else {
  ok("Supabase 存储已配置（文件会存到云端）");
}

if (process.env.RESEND_API_KEY) {
  ok("邮件服务已配置");
} else {
  warn("没配邮件服务 —— 上线后用户收不到验证邮件（但注册能成功）");
}

// ── 2. .env 是否被正确忽略 ────────────────────────────────
//
// 这里刻意**用读文件的方式**判断，而不是执行 `git check-ignore`。
// 原因：执行外部命令在某些受限环境里会被拒绝（我这边就遇到过），
// 而「读 .gitignore 分析规则」是纯 JavaScript，到哪都能跑。
// 代价是判断得没 git 那么精确，但对「.env 有没有被忽略」这种
// 简单规则来说完全够用。
console.log("\n【2. 密钥安全】");
try {
  const gitignore = readFileSync(".gitignore", "utf8");
  const rules = gitignore
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  const coversEnv = rules.some(
    (r) => r === ".env" || r === ".env*" || r === "*.env" || r === "/.env",
  );

  if (coversEnv) {
    ok(".env 已被 gitignore 忽略（密钥不会进仓库）");
  } else {
    problem(".env 没有被忽略！密钥会被提交到 GitHub，非常危险");
  }

  // 顺便确认示例文件是「能被提交」的
  const unignoredExample = rules.some((r) => r === "!.env.example");
  if (unignoredExample) {
    ok(".env.example 例外规则存在（部署模板可以提交）");
  } else {
    warn("没找到 !.env.example 规则，示例模板可能也会被忽略");
  }
} catch {
  warn("读不到 .gitignore，跳过密钥安全检查");
}

// ── 3. 未提交的代码 ──────────────────────────────────────
console.log("\n【3. 代码状态】");
let gitUsable = true;
try {
  const status = execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();

  if (status) {
    const lines = status.split("\n");
    warn(
      `有 ${lines.length} 个文件未提交 —— 部署到 Vercel 的是 **GitHub 上的代码**，` +
        `本地没推的改动不会生效`,
    );
    for (const l of lines.slice(0, 6)) console.log(`         ${l}`);
  } else {
    ok("工作区干净，所有改动都已提交");
  }

  const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  if (branch !== "main" && branch !== "master") {
    warn(`当前分支是 ${branch}，Vercel 默认部署 main 分支`);
  } else {
    ok(`当前分支：${branch}`);
  }
} catch {
  gitUsable = false;
  warn("跑不了 git 命令（受限环境常见，你自己在终端里看一眼 git status 即可）");
}

// ── 4. 迁移文件 ──────────────────────────────────────────
console.log("\n【4. 数据库迁移】");
if (existsSync("prisma/migrations")) {
  // 用 readdirSync 而不是 ls —— 后者在 Windows 上根本不存在
  const dirs = readdirSync("prisma/migrations").filter(
    (d) => !d.endsWith(".toml"),
  );
  ok(`有 ${dirs.length} 个迁移文件（部署后用 npx prisma migrate deploy 应用）`);
  for (const d of dirs) console.log(`         ${d}`);
} else {
  problem("找不到 prisma/migrations 目录");
}

// ── 5. 数据库连通性 ──────────────────────────────────────
console.log("\n【5. 数据库连通性】");
if (process.env.DIRECT_URL) {
  const client = new pg.Client({
    connectionString: process.env.DIRECT_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  try {
    const t0 = Date.now();
    await client.connect();
    const r = await client.query(
      `SELECT COUNT(*)::int AS n FROM pg_tables WHERE schemaname='public'`,
    );
    ok(`连上了（${Date.now() - t0} ms），public 下有 ${r.rows[0].n} 张表`);
    await client.end();
  } catch (error) {
    problem(`连不上：${error.message}`);
    await client.end().catch(() => {});
  }
} else {
  warn("没有 DIRECT_URL，跳过连通性检查");
}

// ── 汇总 ─────────────────────────────────────────────────
console.log("\n" + "=".repeat(56));
if (problems === 0) {
  console.log(`没有阻断性问题 ✅${warnings ? `（${warnings} 条提醒）` : ""}`);
  console.log("\n可以部署了。别忘了：");
  console.log("  1. 在 Vercel 后台填好那 5 个环境变量");
  console.log("  2. 部署后在本地跑 npx prisma migrate deploy");
  console.log("  3. 拿到网址后回来填 NEXT_PUBLIC_SITE_URL，然后 Redeploy");
} else {
  console.log(`发现 ${problems} 个问题 ❌  先解决它们再部署`);
  process.exitCode = 1;
}
