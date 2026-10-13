// 邮件发送 —— 开发阶段「假装发」，直接把内容打印到终端。
//
// 为什么不一开始就接真实的邮件服务？
// 因为它需要 SMTP 账号、授权码，还可能被限流；调试时你会卡在
// 「到底发出去了没」这种问题上。所以这里先只打印，
// 让整个「注册 → 收信 → 点链接验证」的流程能完整跑通。
//
// 等阶段 7 上线时，只需把下面的实现换成真实发信，
// **调用它的业务代码一行都不用改** —— 这就是把外部依赖隔离在一层里的好处。

type MailInput = {
  to: string;
  subject: string;
  text: string;
};

export async function sendMail({ to, subject, text }: MailInput): Promise<void> {
  // 开发环境：打印到终端，方便你直接点里面的链接
  if (process.env.NODE_ENV !== "production") {
    const line = "=".repeat(68);
    console.log(`\n${line}`);
    console.log("📧 模拟发送邮件（开发模式，并未真的发出去）");
    console.log(line);
    console.log(`收件人：${to}`);
    console.log(`主　题：${subject}`);
    console.log("-".repeat(68));
    console.log(text);
    console.log(`${line}\n`);
    return;
  }

  // 生产环境：这里将来换成真实的邮件服务，例如：
  //   await resend.emails.send({ from: "校园汇 <noreply@example.com>", to, subject, text });
  // 现在故意抛错，是为了避免「以为发出去了、其实没有」这种更难查的问题。
  throw new Error(
    "生产环境的邮件发送尚未配置。请在 lib/mail.ts 里接入真实的邮件服务。",
  );
}

/** 拼出网站的完整地址，用于邮件里的链接 */
export function siteUrl(path = ""): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  return base.replace(/\/$/, "") + path;
}
