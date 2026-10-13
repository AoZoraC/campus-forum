import bcrypt from "bcryptjs";

// 密码哈希：把「123456」这种明文，变成一串不可逆的乱码。
//
// 三个关键点，值得你记住：
//
// 1. 为什么绝对不能存明文？
//    数据库一旦泄露（或者被自己人看到），所有人的密码就全暴露了。
//    更糟的是：很多人在多个网站用同一个密码 —— 你泄露一次，
//    等于同时泄露了他的邮箱、网盘、甚至支付账号。
//
// 2. 为什么不能直接用 MD5 / SHA256 算一次？
//    因为那类算法「太快」了。攻击者用显卡每秒能试几十亿次，
//    再复杂的密码也扛不住。bcrypt 是**故意设计得慢**的算法。
//
// 3. salt（盐）是干什么的？
//    防止「彩虹表」攻击。如果两个用户用了同样的密码，
//    不加盐时算出的哈希也完全相同，攻击者一眼就能看出谁和谁密码一样。
//    bcrypt 会自动生成随机盐并把它写进哈希串本身，
//    所以同一个密码每次算出来的结果都不一样，但都能验证通过。

// 成本因子：数值越大越慢越安全。12 是社区常用的平衡点 ——
// 在普通电脑上大约需要 200~300 毫秒。用户登录时完全感觉不到，
// 但攻击者想暴力破解就得多花几个数量级的力气。
const SALT_ROUNDS = 12;

/** 把明文密码变成可以安全存进数据库的哈希串 */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** 校验「用户输入的密码」和「数据库里存的哈希」是否匹配 */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─────────────────────────────────────────────────────────
// 密码强度规则
//
// 这里刻意不要求「必须有大写字母+数字+特殊符号」—— 那类规则
// 实际效果很差（用户会写成 Abc123! 然后到处复用）。
// 长度才是真正有效的因素，所以我们只卡两条：
//   · 至少 8 位
//   · 不能是那几个最烂的常见密码
// ─────────────────────────────────────────────────────────

const COMMON_PASSWORDS = [
  "12345678",
  "123456789",
  "password",
  "qwertyui",
  "11111111",
  "abc12345",
  "iloveyou",
  "admin123",
];

export function checkPasswordStrength(password: string): {
  ok: boolean;
  message?: string;
} {
  if (password.length < 8) {
    return { ok: false, message: "密码至少需要 8 位" };
  }
  if (password.length > 72) {
    // bcrypt 只处理前 72 字节，超长部分会被忽略 ——
    // 与其让用户以为设了个超长密码，不如直接告诉他上限。
    return { ok: false, message: "密码不能超过 72 位" };
  }
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    return { ok: false, message: "这个密码太常见了，换一个吧" };
  }
  return { ok: true };
}
