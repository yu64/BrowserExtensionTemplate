import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

// #############################################################################
// MARK: 定数

/**
 * default export を許すファイル。
 * WXT・ESLint・Vitest が、既定の書き出しを求めるファイルだけにする。
 */
const defaultExportFiles = [
  "*.config.ts",
  // 入り口そのもの（src/wxt の直下のファイルと、入り口のフォルダーの index.ts）だけ。
  // 入り口のフォルダーに置いたほかの部品は、名前付きで書き出す。
  "src/wxt/*.ts",
  "src/wxt/*/index.ts",
];

/**
 * 構文で禁じる書き方。コードの決まり（docs/coding-style.md）のうち、ほかの規則で確かめられないもの。
 */
const restrictedSyntax = [
  {
    selector: "ExportDefaultDeclaration",
    message: "export は名前付きにします。default export は、フレームワークが求めるファイルだけにします。",
  },
  {
    selector: "ClassDeclaration[superClass], ClassExpression[superClass]",
    message: "継承しません。組み合わせで作ります。",
  },
  {
    // consistent-type-assertions は `as const` を通すので、ここで止める。
    selector: "TSAsExpression > TSTypeReference.typeAnnotation[typeName.name='const']",
    message: "`as const` も使いません。型の注釈や satisfies で型を決めます。",
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
      // if・for などの後には空白を入れない（`if(`）。関数の呼び出しと同じ見た目にそろえるため。
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
      // 共通の設定（customize）が catch の後の空白を求めるので、ここで上書きする。
      "@stylistic/space-before-function-paren": ["error", {
        anonymous: "always",
        named: "never",
        asyncArrow: "always",
        catch: "never",
      }],
      // 波かっこは、1行で済むきわめて単純な if に限って省ける。中身の種類は no-restricted-syntax で絞る。
      "curly": ["error", "multi-line", "consistent"],
      // 大きな区切りを空けられるように、空行は2行まで許す。
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
      // 三項演算子と条件型の ? と : は、条件と同じ深さに置く決まりなので、字下げの検査から外す。
      "@stylistic/indent": ["error", 2, { ignoredNodes: ["ConditionalExpression", "TSConditionalType"] }],
      // 型の中で `,` と `;` を使い分けるため、区切りの検査は行わない。
      "@stylistic/member-delimiter-style": "off",
    },
  },
  {
    files: defaultExportFiles,
    rules: { "no-restricted-syntax": ["error", ...restrictedSyntax.filter((rule) => rule.selector !== "ExportDefaultDeclaration")] },
  },
  {
    // 汎用の仕組みは、この拡張のことを知らないままにする。ほかの拡張へそのまま持っていけるようにするため。
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
    // 全体の部品は、入り口に頼らない。入り口が部品を使う向きだけにして、依存が輪にならないようにするため。
    files: ["src/base/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          // 「wxt/...」だけだと WXT のパッケージと区別できないので、@/ か相対の道筋で書いたものだけを止める。
          group: ["@/wxt", "@/wxt/*", "../wxt", "../wxt/*"],
          message: "src/base から src/wxt は読み込みません。",
        }],
      }],
    },
  },
  {
    // Playwright の試験の道具は、引数の分割代入から使う道具を読み取る。使わないときも {} と書く決まりなので許す。
    files: ["test/e2e/**/*.ts"],
    rules: { "no-empty-pattern": ["error", { allowObjectPatternsAsParameters: true }] },
  },
  {
    // 設定ファイルは型の情報なしで読む。tsconfig の対象に入らないものがあるため。
    files: ["*.config.ts"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
