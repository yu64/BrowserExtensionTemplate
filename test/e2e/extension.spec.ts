import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/**
 * コンテンツスクリプトをテストするページの URL。
 * 実際には通信せず、下の `openTestPage` が内容を返す。サーバを起動せずに済ませるため。
 */
const testPageUrl = "http://extension-test.localhost/";

/**
 * コンテンツスクリプトをテストするページ。リンクを3つと、リンク先のない a を1つ持つ。
 */
const testPageHtml = `<!doctype html>
<html lang="ja">
  <head><meta charset="UTF-8"><title>テスト用のページ</title></head>
  <body>
    <a id="top">リンク先のない a（リンクとして数えない）</a>
    <a href="#1">1</a>
    <a href="#2">2</a>
    <a href="#3">3</a>
  </body>
</html>`;

/**
 * テスト用のページを開く。
 */
async function openTestPage(context: BrowserContext): Promise<Page>
{
  await context.route(testPageUrl, (route) => route.fulfill({
    contentType: "text/html; charset=utf-8",
    body: testPageHtml,
  }));
  const page = await context.newPage();
  await page.goto(testPageUrl);
  return page;
}

/**
 * 拡張機能のページを開く。
 * 見出しが表示されるまで待つ。画面は保存済みの値を取得してから描画するので、見出しが表示された時点で操作できる。
 */
async function openExtensionPage(context: BrowserContext, extensionId: string, path: string): Promise<Page>
{
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/${path}`);
  await expect(page.locator("h1")).not.toBeEmpty();
  return page;
}

test("ポップアップに、ユーザの言語のメッセージが表示される", async ({ extensionContext, extensionId }) =>
{
  const popup = await openExtensionPage(extensionContext, extensionId, "popup.html");

  await expect(popup.locator("h1")).toHaveText("拡張機能テンプレート");
  await expect(popup).toHaveTitle("拡張機能テンプレート");
  await expect(popup.locator("html")).toHaveAttribute("lang", "ja");
});

test("ポップアップでカウンターを増やすと、バックグラウンドが保存してバッジに表示する", async ({ extensionContext, extensionId }) =>
{
  const popup = await openExtensionPage(extensionContext, extensionId, "popup.html");
  const counter = popup.locator("#counter");
  await expect(counter).toHaveText("0");

  await popup.locator("#increment").click();
  await popup.locator("#increment").click();

  await expect(counter).toHaveText("2");
  // バッジは拡張機能の API でしか取得できないので、拡張機能のページの中で取得する。
  await expect.poll(() => popup.evaluate("chrome.action.getBadgeText({})")).toBe("2");
});

test("コンテンツスクリプトが、ページのリンクを数える", async ({ extensionContext, extensionId }) =>
{
  await openTestPage(extensionContext);
  const popup = await openExtensionPage(extensionContext, extensionId, "popup.html");

  // ポップアップのボタンは「現在のタブ」に送信するが、テストではポップアップ自身が現在のタブになる。
  // そこで、すべてのタブに同じメッセージを送信し、応答したものを探す。tabs の権限がないので、URL ではタブを選択できない。
  // コンテンツスクリプトは、ページの読み込みの少し後に動作を開始するので、応答するまで待つ。
  await expect.poll(() => popup.evaluate(`
    chrome.tabs.query({}).then((tabs) => Promise.all(tabs.map((tab) => (
      chrome.tabs.sendMessage(tab.id, { type: "countLinks" }).catch(() => undefined)
    )))).then((replies) => replies.find((reply) => reply?.ok))
  `)).toEqual({
    ok: true,
    value: 3,
  });
});

test("設定でリンクを枠で囲むと、開いているページに枠が表示される", async ({ extensionContext, extensionId }) =>
{
  const page = await openTestPage(extensionContext);
  const options = await openExtensionPage(extensionContext, extensionId, "options.html");
  const linksHighlighted = options.locator("#links-highlighted");
  await expect(linksHighlighted).not.toBeChecked();

  await linksHighlighted.click();

  await expect(options.locator("#status")).toHaveText("保存しました。");
  await expect(page.locator("html")).toHaveAttribute("data-extension-template-highlight");
  const outlineStyle = await page.locator("a[href]").first().evaluate((link) => getComputedStyle(link).outlineStyle);
  expect(outlineStyle).toBe("solid");
  // リンク先のない a には、枠を付けない。
  const plainOutlineStyle = await page.locator("#top").evaluate((link) => getComputedStyle(link).outlineStyle);
  expect(plainOutlineStyle).toBe("none");
});
