import { getCurrentUser } from "@/lib/session";
import ResendVerifyButton from "@/components/auth/ResendVerifyButton";

// 邮箱未验证时在页面顶部显示的提示条。
//
// 为什么需要它？因为验证令牌只有 1 小时有效期 —— 用户很可能
// 关掉页面就去上课了，回来时链接早就过期。没有这个入口的话，
// 他就彻底卡在「未验证」状态，而且不知道该干什么。
//
// 这个组件要读登录状态（cookies），属于运行时数据，
// 所以调用它的地方必须包在 <Suspense> 里。

export default async function VerifyEmailBanner() {
  const user = await getCurrentUser();

  // 三种情况都不显示：没登录、已登录且已验证、其他
  if (!user || user.emailVerified) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
        <span className="text-sm text-amber-800">
          你的邮箱还没验证 —— 验证之后才能用「忘记密码」找回账号
        </span>
        <ResendVerifyButton />
      </div>
    </div>
  );
}
