import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

// #############################################################################
// MARK: 設定

/**
 * Vitest（単体テスト）の設定。
 * E2E テストは Playwright で実行する（playwright.config.ts）。
 */
export default defineConfig({
  // browser をモック（fakeBrowser）に置き換える。拡張機能の API を使用する関数も、ブラウザなしでテストできる。
  // @ で src を参照できるようにもなる。
  plugins: [WxtVitest()],
  test: {
    // 単体テストは、テストするモジュールの隣に *.test.ts か *.spec.ts で置く。
    // 拡張機能全体のファイルを確認するテスト（メッセージファイルなど）は、test の直下に置く。
    // test/e2e は Playwright のテストなので含めない。
    include: ["src/**/*.{test,spec}.ts", "test/*.{test,spec}.ts"],
    // テストの間でモックのブラウザの状態が残らないように、毎回初期化する。
    setupFiles: ["test/setup.ts"],
  },
});
