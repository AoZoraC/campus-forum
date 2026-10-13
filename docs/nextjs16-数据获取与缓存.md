# Next.js 16 数据获取与缓存速记

> 这份笔记是项目开发过程中的备忘，记录那些「不看文档就会踩坑」的约束。
> 来源：`node_modules/next/dist/docs/`（Next.js 16.4.0 自带、与安装版本完全一致的文档）

## 1. 我们默认开启了 Cache Components

`next.config.ts` 里由 `create-next-app` 默认写入了：

```ts
cacheComponents: true,
partialPrefetching: true,
```

这两个开关带来的行为叫 **Partial Prerendering（PPR，部分预渲染）**：

- 构建时，每个页面都会被渲染出一个**静态外壳**（导航、标题、布局这些不依赖数据的东西）
- 外壳直接从 CDN 返回，所以**首屏是"瞬间"出现的**
- 依赖实时数据的部分，在用户请求时才流式填补进去

这不是可选项，**是 Next.js 16 新项目的默认形态**。

## 2. 关键约束：异步数据必须「显式交代」

在页面或组件里读取异步数据（数据库查询、fetch、cookies、headers、searchParams）时，
**必须二选一，不能含糊**：

| 数据特性 | 写法 | 结果 |
| --- | --- | --- |
| 所有人看到的一样，可以缓存一会儿 | 函数顶部加 `'use cache'` + `cacheLife('minutes')` | 进入静态外壳，从 CDN 秒出 |
| 每次请求都要最新（比如刚发的帖子） | 用 `<Suspense fallback={...}>` 包起来 | 外壳先出，内容稍后流式填补 |
| 依赖当前登录用户 | 同上，或用 `'use cache: private'` | 按会话缓存 |

**如果两者都不做**，开发模式会直接报 `blocking-route` 错误，并在页面上弹出提示，
让你把数据访问挪进 `<Suspense>` 或者加上 `'use cache'`。

## 3. 对我们的实际影响（阶段 4 会撞上）

首页的帖子列表要从数据库读，写法大概是这样：

```tsx
import { Suspense } from "react";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      {/* 外壳：导航和布局是静态的，立刻可见 */}
      <Suspense fallback={<PostListSkeleton />}>
        {/* 只有这里在请求时才执行 */}
        <PostList />
      </Suspense>
    </>
  );
}
```

也就是说：**我们现在写的静态首页，到阶段 4 不是"删掉重写"，而是"把动态部分套进 Suspense"**。
骨架和样式全部保留。

## 4. 另外两个会报错的小陷阱

- **`Date.now()` / `Math.random()` / `crypto.randomUUID()`**：直接用在渲染里会报
  `blocking-prerender-*`。要么用 `await connection()` 推迟到请求时，要么用 `'use cache'` 缓存。
  我们的假数据里用了「2 小时前」这种字符串，就是为了避开这个问题——等接数据库时，
  时间会从数据库读（本身就不在渲染期计算），所以不会踩到。
- **模块级同步读取**（`fs.readFileSync`）被认为是可预测的，会自动进入静态外壳，没问题。

## 5. 一句话总结

> **静态的让它静态，动态的放进 `<Suspense>`，能缓存的加 `'use cache'`。**
> 三者都不做，Next.js 会报错逼你选一个。
