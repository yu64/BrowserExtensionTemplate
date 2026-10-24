import { defineConfig } from "@playwright/test";

// #############################################################################
// MARK: 設定

/**
 * Playwright（E2E テスト）の設定。
 * Playwright が default export を求めるため、default export にする。
 * テストする拡張機能は `npm run e2e` が事前にビルドする（.output/chrome-mv3）。
 */
export default defineConfig({
  testDir: "test/e2e",
  // 単体テストと同じ命名ルール。置き場所（test/e2e）で区別する。
  testMatch: "**/*.{test,spec}.ts",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  // 1つの Chrome をテストの間で使い回すので、並列では実行しない。拡張機能のテストは数が少ないので、順番に実行する。
  workers: 1,
  // CI では、偶発的な失敗を見分けるために1回だけ再実行する。
  retries: (
    (process.env.CI === undefined)
    ? 0
    : 1
  ),
  reporter: [
    ["list"],
    ["html", {
      outputFolder: "temp/playwright-report",
      open: "never",
    }],
  ],
  outputDir: "temp/playwright-output",
  use: {
    // 失敗したときだけ、原因の調査に使う情報（スクリーンショットとトレース）を保存する。
    // 動画は保存できない。拡張機能を読み込むために独自に起動したブラウザには、動画の記録が適用されないため。
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
