import { resolve } from "node:path";
import { test as base, chromium } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";

// #############################################################################
// MARK: 型定義

/**
 * 試験ごとに用意する道具。
 */
type TestFixtures = {
  /** 試験の前に拡張を初めの状態に戻し、試験の後に片付ける。どの試験でも自動で動く。 */
  resetExtension: undefined;
};

/**
 * 試験を流す間、使い回す道具。
 */
type WorkerFixtures = {
  /**
   * 拡張を読み込んだブラウザー。
   * 試験ごとに開き直すと、Windows では閉じるたびに数秒かかるので、使い回す。
   * 試験の間で状態が残らないように、resetExtension が保存した値を消す。
   */
  extensionContext: BrowserContext;
  /** 読み込んだ拡張の ID。拡張のページの URL を作るのに使う。 */
  extensionId: string;
  /** 拡張の API を呼ぶためだけに開いておく、拡張のページ。 */
  controlPage: Page;
};

// #############################################################################
// MARK: 定数

/**
 * 試す拡張の出力先。`npm run e2e` が、先に作っておく。
 */
const extensionDir = resolve(import.meta.dirname, "../../.output/chrome-mv3");

// #############################################################################
// MARK: 試験の道具

/**
 * 拡張を読み込んだブラウザーで試験する `test`。
 *
 * インストールしてある Chrome（channel: "chrome"）を使う。
 * Playwright が配る Chromium は署名がなく、Windows の「スマート アプリ コントロール」が有効だと起動できないため。
 * 正式版の Chrome は起動時の `--load-extension` を受け付けないので、
 * DevTools プロトコルの `Extensions.loadUnpacked` で、開いた後に読み込む。
 *
 * Playwright は、引数の分割代入から使う道具を読み取るので、使わない道具も `{}` と書く決まり。
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  extensionContext: [
    async ({}, use) =>
    {
      const context = await chromium.launchPersistentContext("", {
        channel: "chrome",
        // 拡張の文言を日本語にそろえる。
        locale: "ja-JP",
        // Playwright は既定で拡張を止めて起動するので、その指定だけを外す。
        ignoreDefaultArgs: ["--disable-extensions"],
        args: [
          // DevTools プロトコルから拡張を読み込めるようにする。
          "--enable-unsafe-extension-debugging",
          "--lang=ja",
        ],
      });
      const browser = context.browser();
      if(browser === null) throw new Error("ブラウザーにつなげません。");
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
      // 拡張の背景（service worker）の URL は chrome-extension://<ID>/background.js の形なので、そこから ID を取る。
      const worker = extensionContext.serviceWorkers()[0] ?? await extensionContext.waitForEvent("serviceworker");
      await use(new URL(worker.url()).host);
    },
    { scope: "worker" },
  ],
  controlPage: [
    async ({ extensionContext, extensionId }, use) =>
    {
      // 最初からあるタブを使う。どのタブも閉じきると、ブラウザーごと終わることがあるため、このタブは残しておく。
      const page = extensionContext.pages()[0] ?? await extensionContext.newPage();
      await page.goto(`chrome-extension://${extensionId}/manifest.json`);
      await use(page);
    },
    { scope: "worker" },
  ],
  resetExtension: [
    async ({ extensionContext, controlPage }, use) =>
    {
      // 保存した値を消して、まだ何も保存していない状態から始める。
      await controlPage.evaluate("Promise.all([chrome.storage.local.clear(), chrome.storage.sync.clear()])");
      await use(undefined);
      // 試験で開いたタブと、差し替えたページの中身を片付ける。
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
