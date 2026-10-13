#!/usr/bin/env node
// 数据库地址自检工具
//
// 作用：在你跑建表命令之前，先检查 .env 里的两个地址填得对不对。
// 它「不会」连接数据库，只看格式 —— 所以能秒出结果，也能提前拦住
// 那些会让你一脸懵的报错（P1001、authentication failed 之类）。
//
// 支持两种后端：
//   · 云端 Supabase：需要区分连接池（6543）和直连（5432）
//   · 本机 PostgreSQL：不需要区分，两个地址填一样即可
//
// 用法：node scripts/check-env.mjs

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

const OK = "  [通过]";
const BAD = "  [问题]";
const WARN = "  [注意]";

let problems = 0;

function problem(msg) {
  console.log(`${BAD} ${msg}`);
  problems += 1;
}

if (!existsSync(envPath)) {
  console.log("找不到 .env 文件（应该在项目根目录）。");
  process.exit(1);
}

// ── 解析 .env ──────────────────────────────────────────────
const raw = readFileSync(envPath, "utf8");
const vars = {};
for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  vars[key] = value;
}

console.log("校园汇 · 数据库地址自检\n");

const PLACEHOLDER = /\[?(your[-_]?password|password|passwd|密码)\]?/i;
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|::1)$/;

function checkOne(key, expectPort, expectMeaning) {
  console.log(`【${key}】`);
  const value = vars[key];

  if (!value) {
    problem(`没有填写（这是空引号 ""，需要把数据库地址粘进去）`);
    console.log("");
    return null;
  }

  if (!/^postgres(ql)?:\/\//.test(value)) {
    problem(`不是以 postgresql:// 开头。当前开头是：${value.slice(0, 30)}…`);
    console.log("");
    return null;
  }

  if (PLACEHOLDER.test(value)) {
    problem(
      "地址里还留着 [YOUR-PASSWORD] 之类的占位符，要把数据库密码替换进去",
    );
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    problem(
      "这串地址无法被解析。常见原因：密码里有 @ : / ? # 等特殊字符没做转义。",
    );
    console.log("");
    return null;
  }

  const port = url.port || "(默认)";
  const host = url.hostname;
  const hasPassword = url.password.length > 0;
  const isLocal = LOCAL_HOST.test(host);

  console.log(`${OK} 格式可解析`);
  console.log(`       主机：${host}`);
  console.log(`       端口：${port}`);
  console.log(`       库名：${url.pathname.replace(/^\//, "") || "(未指定)"}`);
  console.log(
    `       密码：${hasPassword ? "已包含（长度 " + url.password.length + "）" : "缺失"}`,
  );

  if (!hasPassword) {
    problem("地址里没有密码。格式应该是 postgresql://用户名:密码@主机:端口/库名");
  }

  if (isLocal) {
    console.log(`${OK} 这是本机数据库，不需要区分连接池 / 直连`);
    console.log("");
    return { url, port: String(port), host, local: true };
  }

  if (host.includes("supabase") && !host.includes("pooler") && port === "5432") {
    console.log(`${WARN} 这看起来是 Supabase 的「直连」地址（db.xxx.supabase.co:5432）`);
  }

  if (expectPort && String(port) !== String(expectPort)) {
    problem(
      `端口是 ${port}，但 ${key} 应该是 ${expectPort}（${expectMeaning}）。` +
        (port === "6543" || port === "5432"
          ? " 两个地址很可能填反了。"
          : ""),
    );
  } else if (expectPort) {
    console.log(`${OK} 端口正确（${expectPort} = ${expectMeaning}）`);
  }

  console.log("");
  return { url, port: String(port), host, local: false };
}

const a = checkOne("DATABASE_URL", 6543, "连接池，网站运行时用");
const b = checkOne("DIRECT_URL", 5432, "直连，建表/迁移时用");

// ── 汇总 ───────────────────────────────────────────────────
if (a && b && !a.local && a.host === b.host) {
  console.log(`${WARN} 两个地址的主机相同（${a.host}）—— 这在 Supabase 上是正常的。`);
  console.log("       它的连接池和直连共用同一个主机，只靠端口区分：");
  console.log("       6543 = 连接池（给网站用） / 5432 = 直连（给建表用）");
  console.log("       只要上面两个端口都通过了，就没问题。");
  console.log("");
}

console.log("─".repeat(52));
if (problems === 0) {
  console.log("全部通过 ✅  可以跑建表命令了：");
  console.log("    npx prisma migrate dev --name init");
} else {
  console.log(`发现 ${problems} 个问题 ❌  修好之后再跑建表命令。`);
  console.log("（改完 .env 保存，再重新运行本脚本即可）");
  process.exitCode = 1;
}
