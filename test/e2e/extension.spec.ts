import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BrowserContext, Page } from "@playwright/test";
import { z } from "zod/mini";
import { expect, test } from "./fixtures";

/**
 * メッセージファイルのフォルダ。
 */
const localesDir = join(import.meta.dirname, "../../public/_locales");

/**
 * メッセージファイルの形式。テストで使用する項目だけを検証する。
 */
const messagesSchema = z.record(z.string(), z.looseObject({
  message: z.string(),
  placeholders: z.optional(z.record(z.string(), z.looseObject({ content: z.string() }))),
}));

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
 * 画面に表示されている言語のメッセージを取得する関数を作成する。
 * 画面の lang 属性から言語を判定し、その言語のメッセージファイルと比較する。
 * ブラウザの言語が環境によって変わっても（macOS では起動時の言語指定が効かないことがある）、テストが成功するようにするため。
 */
async function createMessageGetter(page: Page): Promise<(name: string, ...substitutions: string[]) => string>
{
  const lang = await page.locator("html").getAttribute("lang") ?? "";
  const messages = messagesSchema.parse(JSON.parse(readFileSync(join(localesDir, lang, "messages.json"), "utf8")));

  return (name, ...substitutions) =>
  {
    const entry = messages[name];
    if(entry === undefined) throw new Error(`メッセージがありません: ${lang}/${name}`);

    // $COUNT$ のようなプレースホルダーを、content（$1 など）が指す引数で置き換える。
    let text = entry.message;

    for(const [key, placeholder] of Object.entries(entry.placeholders ?? {}))
    {
      const index = Number(placeholder.content.replace("$", "")) - 1;
      text = text.replaceAll(new RegExp(`\\$${key}\\$`, "gi"), substitutions[index] ?? "");
    }

    return text;
  };
}

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
  const message = await createMessageGetter(popup);

  await expect(popup.locator("h1")).toHaveText(message("extName"));
  await expect(popup).toHaveTitle(message("extName"));
  await expect(popup.locator("html")).toHaveAttribute("lang", message("htmlLang"));
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

test("ポップアップのボタンで、現在のタブのリンクを数える", async ({ extensionContext, extensionId }) =>
{
  const page = await openTestPage(extensionContext);
  const popup = await openExtensionPage(extensionContext, extensionId, "popup.html");
  const linkCount = popup.locator("#link-count");
  const message = await createMessageGetter(popup);

  // テストではポップアップもタブとして開くので、テスト用のページを前面に出して「現在のタブ」にする。
  await page.bringToFront();

  // コンテンツスクリプトは、ページの読み込みの少し後に動作を開始するので、数えられるまで押し直す。
  await expect(async () =>
  {
    await popup.locator("#count-links").click();
    await expect(linkCount).toHaveText(message("popupLinkCount", "3"), { timeout: 1000 });
  }).toPass();
});

test("設定でリンクを枠で囲むと、開いているページに枠が表示される", async ({ extensionContext, extensionId }) =>
{
  const page = await openTestPage(extensionContext);
  const options = await openExtensionPage(extensionContext, extensionId, "options.html");
  const isLinkHighlighted = options.locator("#link-highlighted");
  const message = await createMessageGetter(options);
  await expect(isLinkHighlighted).not.toBeChecked();

  await isLinkHighlighted.click();

  await expect(options.locator("#status")).toHaveText(message("optionsSaved"));
  await expect(page.locator("html")).toHaveAttribute("data-extension-template-highlight");
  const outlineStyle = await page.locator("a[href]").first().evaluate((link) => getComputedStyle(link).outlineStyle);
  expect(outlineStyle).toBe("solid");
  // リンク先のない a には、枠を付けない。
  const plainOutlineStyle = await page.locator("#top").evaluate((link) => getComputedStyle(link).outlineStyle);
  expect(plainOutlineStyle).toBe("none");
});
