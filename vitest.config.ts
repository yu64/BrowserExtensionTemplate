import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

// #############################################################################
// MARK: 設定

/**
 * Vitest（単体試験）の設定。
 * E2E 試験は Playwright で流す（playwright.config.ts）。
 */
export default defineConfig({
  // browser を偽物（fakeBrowser）に差し替える。拡張の API を使う関数も、ブラウザーなしで試せる。
  // @ で src を指せるようにもなる。
  plugins: [WxtVitest()],
  test: {
    // 単体試験は、試す部品の隣に *.test.ts か *.spec.ts で置く。
    // 拡張全体のファイルを確かめる試験（文言のファイルなど）は、test の直下に置く。
    // test/e2e は Playwright の試験なので含めない。
    include: ["src/**/*.{test,spec}.ts", "test/*.{test,spec}.ts"],
    // 試験の間で偽物のブラウザーの状態が残らないように、毎回まっさらにする。
    setupFiles: ["test/setup.ts"],
  },
});
