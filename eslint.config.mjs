import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma 自动生成的客户端代码，不需要我们检查它的代码规范
    "lib/generated/**",
  ]),
  // 约定：下划线开头的参数表示「故意不用」。
  //
  // 例如 Server Action 的签名必须是 (prevState, formData)，
  // 但「重新发送验证邮件」这种动作并不需要用到它们 ——
  // 留着不删是因为签名必须匹配。用下划线标注一下，
  // 让 ESLint 知道这是有意的，而不是「忘了删」。
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
