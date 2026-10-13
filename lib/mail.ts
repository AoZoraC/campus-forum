// 邮件发送。
//
// ── 开发的三个阶段，行为不一样 ──
//
// ① 本地开发：打印到终端。你能立刻看到验证链接，点一下就完成流程。
//
// ② 生产环境但没配邮件服务：**打印到服务器日志，并且不阻断流程。**
//    这是很重要的一点 —— 如果这里抛错，用户注册会直接失败。
//    「收不到验证邮件」已经够糟了，不该让它升级成「根本注册不了」。
//
// ③ 生产环境且配了 RESEND_API_KEY：真的发信。
//
// 等你有精力接真实邮件时，只要去 resend.com 注册（免费额度每月 3000 封）、
// 把密钥填进环境变量，第 ③ 条分支就自动生效了。业务代码一行不用改。

type MailInput = {
  to: string;
  subject: string;
  text: string;
};

export async function sendMail({ to, subject, text }: MailInput): Promise<void> {
  const isProduction = process.env.NODE_ENV === "production";
  const apiKey = process.env.RESEND_API_KEY;

  // ── ③ 配了真实邮件服务：真发 ──
  if (isProduction && apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Resend 提供了一个不用验证域名的测试发件地址。
          // 自己买域名之后，换成 noreply@你的域名 能显著提高送达率。
          from: process.env.MAIL_FROM ?? "校园汇 <onboarding@resend.dev>",
          to,
          subject,
          text,
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error(`[邮件] 发送失败（${res.status}）：${detail.slice(0, 300)}`);
      }
      return;
    } catch (error) {
      // 发信失败也**不能让注册流程崩掉** —— 记下来就好
      console.error("[邮件] 发送异常：", error);
      return;
    }
  }

  // ── ① 和 ②：打印出来 ──
  const line = "=".repeat(68);
  const tag = isProduction ? "生产环境未配置邮件服务" : "开发模式";
  console.log(`\n${line}`);
  console.log(`📧 模拟发送邮件（${tag}，并未真的发出去）`);
  console.log(line);
  console.log(`收件人：${to}`);
  console.log(`主　题：${subject}`);
  console.log("-".repeat(68));
  console.log(text);
  console.log(`${line}\n`);

  if (isProduction) {
    console.log(
      "提示：内容已打印到服务器日志。配置 RESEND_API_KEY 后即可真正发信。",
    );
  }
}

/** 拼出网站的完整地址，用于邮件里的链接 */
export function siteUrl(path = ""): string {
  // 优先用显式配置的网址；其次用 Vercel 自动注入的部署地址；最后退回本地
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  return base.replace(/\/$/, "") + path;
}
