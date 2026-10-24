import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

// #############################################################################
// MARK: 定数

/**
 * default export を許可するファイル。
 * WXT・ESLint・Vitest などが、default export を求めるファイルだけにする。
 */
const defaultExportFiles = [
  "*.config.ts",
  // エントリポイントそのもの（src/wxt の直下のファイルと、エントリポイントのフォルダの index.ts）だけ。
  // エントリポイントのフォルダに置いたほかのモジュールは、名前付きで export する。
  "src/wxt/*.ts",
  "src/wxt/*/index.ts",
];

/**
 * 構文で禁止する書き方。コーディングルール（docs/coding-style.md）のうち、ほかのルールで検査できないもの。
 */
const restrictedSyntax = [
  {
    selector: "ExportDefaultDeclaration",
    message: "export は名前付きにします。default export は、フレームワークが求めるファイルだけにします。",
  },
  {
    selector: "ClassDeclaration[superClass], ClassExpression[superClass]",
    message: "継承は使用しません。合成（コンポジション）で実装します。",
  },
  {
    // consistent-type-assertions は `as const` を許可するので、ここで禁止する。
    selector: "TSAsExpression > TSTypeReference.typeAnnotation[typeName.name='const']",
    message: "`as const` も使用しません。型注釈や satisfies で型を指定します。",
  },
  {
    selector: "MethodDefinition[kind='method']",
    message: "クラスの中の関数は、アロー関数のフィールドにします。",
  },
  {
    selector: "IfStatement > .consequent:not(BlockStatement, ReturnStatement, ContinueStatement, BreakStatement, ThrowStatement)",
    message: "波かっこを省けるのは、return・continue・break・throw だけのきわめて単純な if です。",
  },
  {
    selector: "IfStatement[alternate] > .consequent:not(BlockStatement)",
    message: "else がある if は、波かっこを省きません。",
  },
];

// #############################################################################
// MARK: 設定

/**
 * ESLint の設定。
 * ESLint が既定の書き出しを求めるため、default export にする。
 */
export default defineConfig(
  globalIgnores([
    ".output/",
    ".wxt/",
    "node_modules/",
  ]),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  // React のフックのルール（呼び出す場所・依存配列など）を検査する。
  reactHooks.configs.flat.recommended,
  stylistic.configs.customize({
    indent: 2,
    quotes: "double",
    semi: true,
    commaDangle: "always-multiline",
    braceStyle: "allman",
    arrowParens: true,
  }),
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // ===== 全体の書き方 =====
      "func-style": ["error", "declaration"],
      "no-restricted-syntax": ["error", ...restrictedSyntax],
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": ["error", {
        prefer: "type-imports",
        fixStyle: "separate-type-imports",
      }],
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      // 依存配列の記述漏れはエラーにする。意図的に除外するときは、eslint-disable のコメントに理由を書くルールのため。
      "react-hooks/exhaustive-deps": "error",
      // ===== クラス =====
      "@typescript-eslint/explicit-member-accessibility": ["error", { accessibility: "explicit" }],
      "@typescript-eslint/naming-convention": ["error", {
        selector: "typeParameter",
        format: ["PascalCase"],
        custom: {
          regex: "^T[A-Z][A-Za-z0-9]*$",
          match: true,
        },
      }],
      // ===== 整形の形 =====
      // if・for などの後には空白を入れない（`if(`）。関数呼び出しと同じ見た目に統一するため。
      "@stylistic/keyword-spacing": ["error", {
        before: true,
        after: true,
        overrides: {
          if: { after: false },
          for: { after: false },
          while: { after: false },
          switch: { after: false },
          catch: { after: false },
        },
      }],
      // catch も if と同じく、後に空白を入れない（`catch(`）。
      // 共通の設定（customize）が catch の後の空白を要求するので、ここで上書きする。
      "@stylistic/space-before-function-paren": ["error", {
        anonymous: "always",
        named: "never",
        asyncArrow: "always",
        catch: "never",
      }],
      // 波かっこは、1行で済む極めて単純な if に限って省略できる。本文の種類は no-restricted-syntax で制限する。
      "curly": ["error", "multi-line", "consistent"],
      // 大きな区切りを空けられるように、空行は2行まで許可する。
      "@stylistic/no-multiple-empty-lines": ["error", {
        max: 2,
        maxBOF: 0,
        maxEOF: 0,
      }],
      "@stylistic/operator-linebreak": ["error", "before"],
      "@stylistic/multiline-ternary": ["error", "always-multiline"],
      "@stylistic/object-curly-newline": ["error", {
        ObjectExpression: {
          multiline: true,
          minProperties: 2,
        },
      }],
      "@stylistic/object-property-newline": "error",
      // 三項演算子と条件型の ? と : は、条件と同じ深さに置くルールなので、インデントの検査から除外する。
      "@stylistic/indent": ["error", 2, { ignoredNodes: ["ConditionalExpression", "TSConditionalType"] }],
      // 型の中で `,` と `;` を使い分けるため、区切り文字の検査は行わない。
      "@stylistic/member-delimiter-style": "off",
    },
  },
  {
    files: defaultExportFiles,
    rules: { "no-restricted-syntax": ["error", ...restrictedSyntax.filter((rule) => rule.selector !== "ExportDefaultDeclaration")] },
  },
  {
    // 汎用のモジュールは、この拡張機能に依存させない。ほかの拡張機能でもそのまま使用できるようにするため。
    files: ["src/util/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/base", "@/base/*", "../base", "../base/*"],
          message: "src/util から src/base は読み込みません。",
        }],
      }],
    },
  },
  {
    // 共通のモジュールは、エントリポイントに依存させない。依存の向きを一方向にして、循環しないようにするため。
    files: ["src/base/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          // 「wxt/...」だけだと WXT のパッケージと区別できないので、@/ か相対パスで記述したものだけを禁止する。
          group: ["@/wxt", "@/wxt/*", "../wxt", "../wxt/*"],
          message: "src/base から src/wxt は読み込みません。",
        }],
      }],
    },
  },
  {
    // Playwright のフィクスチャは、引数の分割代入から使用するものを判定する。使用しないときも {} と書く必要があるので許可する。
    files: ["test/e2e/**/*.ts"],
    rules: { "no-empty-pattern": ["error", { allowObjectPatternsAsParameters: true }] },
  },
  {
    // 設定ファイルは型情報なしで検査する。tsconfig の対象に含まれないものがあるため。
    files: ["*.config.ts"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
