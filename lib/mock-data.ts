// 阶段 1 的「假数据」。
//
// 为什么先写假数据？因为我们要先看到页面长什么样，再决定数据该怎么存。
// 这叫「先搭骨架，后通血管」—— 等阶段 2 建好数据库，这些内容会从数据库读出来，
// 但这个文件里的「形状」（Board / Post 两个类型）会原样保留下来，
// 它会变成数据库表的结构。所以别小看它。

export type Board = {
  slug: string; // 网址里用的英文标识，例如 /?board=study
  name: string; // 显示给同学看的中文名
  description: string;
};

export type Post = {
  id: number;
  boardSlug: string; // 这条帖子属于哪个板块
  title: string;
  excerpt: string; // 摘要，列表里只显示一行
  author: string;
  createdAt: string; // 阶段 1 先用「2 小时前」这种文字，阶段 2 会换成真实时间戳
  replyCount: number;
  viewCount: number;
};

// 你选的三个板块，外加一个「全部」（它不是一个真正的板块，只用来筛选）
export const boards: Board[] = [
  { slug: "all", name: "全部", description: "所有板块的最新帖子" },
  { slug: "study", name: "学习交流", description: "课程讨论、作业求助、老师评价" },
  { slug: "resource", name: "资源分享", description: "课件、电子书、工具与网盘链接" },
  { slug: "general", name: "综合讨论", description: "失物招领、社团活动、随便聊聊" },
];

// 10 条编出来的帖子，故意做得像真实校园里会发生的事
export const posts: Post[] = [
  {
    id: 1,
    boardSlug: "study",
    title: "有没有人上过王老师的离散数学？求个复习重点",
    excerpt: "期中快到了，不知道他考不考证明题，上学期听说挂了不少人……",
    author: "张三",
    createdAt: "2 小时前",
    replyCount: 12,
    viewCount: 89,
  },
  {
    id: 2,
    boardSlug: "resource",
    title: "分享一份高数期末复习提纲（附网盘链接）",
    excerpt: "自己整理了一周，把上下册的重点公式和典型例题都归到一起了。",
    author: "李四",
    createdAt: "昨天",
    replyCount: 34,
    viewCount: 210,
  },
  {
    id: 3,
    boardSlug: "general",
    title: "图书馆四楼捡到一张校园卡，失主看到请联系我",
    excerpt: "卡面名字是「陈」，已经交到四楼前台了，别着急。",
    author: "王五",
    createdAt: "3 小时前",
    replyCount: 5,
    viewCount: 45,
  },
  {
    id: 4,
    boardSlug: "study",
    title: "数据结构 lab3 第 4 题，我的链表反转为什么一直死循环",
    excerpt: "照着课本写的，但一跑就卡住，是不是指针顺序错了？",
    author: "赵六",
    createdAt: "昨天",
    replyCount: 18,
    viewCount: 132,
  },
  {
    id: 5,
    boardSlug: "resource",
    title: "计算机二级备考资料整理（含近五年真题）",
    excerpt: "MS Office 和 Python 两个方向都有，按年份分好文件夹了。",
    author: "孙七",
    createdAt: "2 天前",
    replyCount: 27,
    viewCount: 305,
  },
  {
    id: 6,
    boardSlug: "general",
    title: "有人一起打羽毛球吗？每周三晚上体育馆",
    excerpt: "现在固定有 4 个人，想再找 2 个，水平不限，主要是玩。",
    author: "周八",
    createdAt: "4 小时前",
    replyCount: 9,
    viewCount: 67,
  },
  {
    id: 7,
    boardSlug: "study",
    title: "求推荐一门好过的通识选修课",
    excerpt: "这学期还差 2 个学分，想找那种不点名、期末交论文的。",
    author: "吴九",
    createdAt: "1 天前",
    replyCount: 41,
    viewCount: 380,
  },
  {
    id: 8,
    boardSlug: "resource",
    title: "Python 爬虫入门笔记，附我自己写的示例代码",
    excerpt: "从 requests 到 BeautifulSoup，每一步都有注释，适合零基础。",
    author: "郑十",
    createdAt: "3 天前",
    replyCount: 22,
    viewCount: 256,
  },
  {
    id: 9,
    boardSlug: "general",
    title: "这学期的英语角还办吗？",
    excerpt: "上学期每周五在文科楼，这学期好像没看到通知。",
    author: "陈一",
    createdAt: "5 小时前",
    replyCount: 3,
    viewCount: 28,
  },
  {
    id: 10,
    boardSlug: "study",
    title: "线性代数期中试卷有人有吗？想练几套",
    excerpt: "网上找的版本都不太一样，想要本校往届的。",
    author: "林二",
    createdAt: "2 天前",
    replyCount: 15,
    viewCount: 190,
  },
];
