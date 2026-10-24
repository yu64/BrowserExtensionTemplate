import { defineConfig } from "@playwright/test";

// #############################################################################
// MARK: 設定

/**
 * Playwright（E2E 試験）の設定。
 * Playwright が既定の書き出しを求めるため、default export にする。
 * 試す拡張は `npm run e2e` が先に作る（.output/chrome-mv3）。
 */
export default defineConfig({
  testDir: "test/e2e",
  // 単体試験と同じ名前の決まり。置き場所（test/e2e）で見分ける。
  testMatch: "**/*.{test,spec}.ts",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  // 1つの Chrome を試験ごとに開き直すので、並べて流すと重くなる。拡張の試験は数が少ないので、順に流す。
  workers: 1,
  // CI では、たまたまの失敗を見分けるために1回だけやり直す。
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
    // 失敗したときだけ、原因を追う材料（画面の写真と操作の記録）を残す。
    // 動画は残せない。拡張を読み込むために自分で開いたブラウザーには、動画の記録がかからないため。
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
