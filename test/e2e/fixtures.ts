import { resolve } from "node:path";
import { test as base, chromium } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";

// #############################################################################
// MARK: 型定義

/**
 * テストごとに準備するフィクスチャ。
 */
type TestFixtures = {
  /** テストの前に拡張機能を初期状態に戻し、テストの後に後処理をする。どのテストでも自動で実行される。 */
  resetExtension: undefined;
};

/**
 * テストの実行中に使い回すフィクスチャ。
 */
type WorkerFixtures = {
  /**
   * 拡張機能を読み込んだブラウザ。
   * テストごとに起動し直すと、Windows では終了のたびに数秒かかるので、使い回す。
   * テストの間で状態が残らないように、resetExtension が保存済みの値を削除する。
   */
  extensionContext: BrowserContext;
  /** 読み込んだ拡張機能の ID。拡張機能のページの URL の作成に使用する。 */
  extensionId: string;
  /** 拡張機能の API を呼び出すためだけに開いておく、拡張機能のページ。 */
  controlPage: Page;
};

// #############################################################################
// MARK: 定数

/**
 * テストする拡張機能の出力先。`npm run e2e` が事前にビルドする。
 */
const extensionDir = resolve(import.meta.dirname, "../../.output/chrome-mv3");

// #############################################################################
// MARK: フィクスチャ

/**
 * 拡張機能を読み込んだブラウザでテストする `test`。
 *
 * インストール済みの Chrome（channel: "chrome"）を使用する。
 * Playwright が配布する Chromium は署名がなく、Windows の「スマート アプリ コントロール」が有効だと起動できないため。
 * 正式版の Chrome は起動時の `--load-extension` を受け付けないので、
 * DevTools プロトコルの `Extensions.loadUnpacked` で、起動後に読み込む。
 *
 * Playwright は、引数の分割代入から使用するフィクスチャを判定するので、使用しないときも `{}` と書く必要がある。
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  extensionContext: [
    async ({}, use) =>
    {
      const context = await chromium.launchPersistentContext("", {
        channel: "chrome",
        // 拡張機能のメッセージを日本語にする。
        locale: "ja-JP",
        // Playwright は既定で拡張機能を無効にして起動するので、その指定だけを除外する。
        ignoreDefaultArgs: ["--disable-extensions"],
        args: [
          // DevTools プロトコルから拡張機能を読み込めるようにする。
          "--enable-unsafe-extension-debugging",
          "--lang=ja",
        ],
      });
      const browser = context.browser();
      if(browser === null) throw new Error("ブラウザに接続できません。");
      const session = await browser.newBrowserCDPSession();
      await session.send("Extensions.loadUnpacked", { path: extensionDir });
      await use(context);
      await context.close();
    },
    { scope: "worker" },
  ],
  extensionId: [
    async ({ extensionContext }, use) =>
    {
      // バックグラウンド（Service Worker）の URL は chrome-extension://<ID>/background.js の形式なので、そこから ID を取得する。
      const worker = extensionContext.serviceWorkers()[0] ?? await extensionContext.waitForEvent("serviceworker");
      await use(new URL(worker.url()).host);
    },
    { scope: "worker" },
  ],
  controlPage: [
    async ({ extensionContext, extensionId }, use) =>
    {
      // 最初から開いているタブを使用する。すべてのタブを閉じると、ブラウザごと終了することがあるため、このタブは残す。
      const page = extensionContext.pages()[0] ?? await extensionContext.newPage();
      await page.goto(`chrome-extension://${extensionId}/manifest.json`);
      await use(page);
    },
    { scope: "worker" },
  ],
  resetExtension: [
    async ({ extensionContext, controlPage }, use) =>
    {
      // 保存済みの値を削除して、何も保存されていない状態から開始する。
      await controlPage.evaluate("Promise.all([chrome.storage.local.clear(), chrome.storage.sync.clear()])");
      await use(undefined);
      // テストで開いたタブと、置き換えたページの内容を後処理する。
      for(const page of extensionContext.pages())
      {
        if(page !== controlPage)
        {
          await page.close();
        }
      }
      await extensionContext.unrouteAll();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
