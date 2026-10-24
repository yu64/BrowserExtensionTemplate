import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/**
 * 内容スクリプトを試すページの URL。
 * 実際には取りに行かず、下の `openTestPage` が中身を返す。サーバーを立てずに済ませるため。
 */
const testPageUrl = "http://extension-test.localhost/";

/**
 * 内容スクリプトを試すページ。リンクを3つと、行き先のない a を1つ持つ。
 */
const testPageHtml = `<!doctype html>
<html lang="ja">
  <head><meta charset="UTF-8"><title>試験のページ</title></head>
  <body>
    <a id="top">行き先のない a（リンクとして数えない）</a>
    <a href="#1">1</a>
    <a href="#2">2</a>
    <a href="#3">3</a>
  </body>
</html>`;

/**
 * 試験のページを開く。
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
 * 拡張のページを開く。
 * 文言が入るまで待つ。画面は最後に文言を入れるので、そのときには保存した値も出ていて、操作も受け付ける。
 */
async function openExtensionPage(context: BrowserContext, extensionId: string, path: string): Promise<Page>
{
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/${path}`);
  await expect(page.locator("h1")).not.toBeEmpty();
  return page;
}

test("ポップアップに、利用者の言語の文言が出る", async ({ extensionContext, extensionId }) =>
{
  const popup = await openExtensionPage(extensionContext, extensionId, "popup.html");

  await expect(popup.locator("h1")).toHaveText("拡張のひな形");
  await expect(popup).toHaveTitle("拡張のひな形");
  await expect(popup.locator("html")).toHaveAttribute("lang", "ja");
});

test("ポップアップで数を増やすと、背景が保存してバッジに出す", async ({ extensionContext, extensionId }) =>
{
  const popup = await openExtensionPage(extensionContext, extensionId, "popup.html");
  const counter = popup.locator("#counter");
  await expect(counter).toHaveText("0");

  await popup.locator("#increment").click();
  await popup.locator("#increment").click();

  await expect(counter).toHaveText("2");
  // バッジは拡張の API でしか読めないので、拡張のページの中で読む。
  await expect.poll(() => popup.evaluate("chrome.action.getBadgeText({})")).toBe("2");
});

test("内容スクリプトが、ページのリンクを数える", async ({ extensionContext, extensionId }) =>
{
  await openTestPage(extensionContext);
  const popup = await openExtensionPage(extensionContext, extensionId, "popup.html");

  // ポップアップのボタンは「今のタブ」に送るが、試験ではポップアップ自身が今のタブになる。
  // そこで、全部のタブに同じメッセージを送り、答えたものを探す。tabs の権限がないので、URL ではタブを選べない。
  // 内容スクリプトは、ページを読み終えた少し後に動き出すので、答えるまで待つ。
  await expect.poll(() => popup.evaluate(`
    chrome.tabs.query({}).then((tabs) => Promise.all(tabs.map((tab) => (
      chrome.tabs.sendMessage(tab.id, { type: "countLinks" }).catch(() => undefined)
    )))).then((replies) => replies.find((reply) => reply?.ok))
  `)).toEqual({
    ok: true,
    value: 3,
  });
});

test("設定でリンクを枠で囲むと、開いているページに枠が出る", async ({ extensionContext, extensionId }) =>
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
  // 行き先のない a には、枠を付けない。
  const plainOutlineStyle = await page.locator("#top").evaluate((link) => getComputedStyle(link).outlineStyle);
  expect(plainOutlineStyle).toBe("none");
});
