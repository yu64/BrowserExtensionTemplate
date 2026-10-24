import { browser } from "wxt/browser";
import { loadCounter, watchCounter } from "@/base/Counter";
import { elementOf } from "@/util/dom";
import { applyI18n, messageOf } from "@/util/i18n";
import { messenger } from "@/base/protocol";

// #############################################################################
// MARK: 内部関数

/**
 * ポップアップの本体。
 * 操作を受け付けられるようにし、保存した値を出してから、最後に文言を入れる。
 * 文言が入ったときには使える状態になっているので、動かないうちにボタンが押されることがない。
 */
async function main(): Promise<void>
{
  const counter = elementOf("#counter", HTMLOutputElement);
  const increment = elementOf("#increment", HTMLButtonElement);
  const countLinks = elementOf("#count-links", HTMLButtonElement);
  const linkCount = elementOf("#link-count", HTMLParagraphElement);
  const openOptions = elementOf("#open-options", HTMLButtonElement);
  const error = elementOf("#error", HTMLParagraphElement);

  /**
   * 数を画面に出す。
   */
  function showCounter(count: number): void
  {
    counter.value = String(count);
  }

  increment.addEventListener("click", () =>
  {
    void messenger.send("incrementCounter").then(
      (count) =>
      {
        error.textContent = "";
        showCounter(count);
      },
      (reason: unknown) =>
      {
        console.error(reason);
        error.textContent = messageOf("popupIncrementFailed");
      },
    );
  });

  countLinks.addEventListener("click", () =>
  {
    void linkCountOfActiveTab().then(
      (count) =>
      {
        linkCount.classList.remove("error");
        linkCount.textContent = messageOf("popupLinkCount", String(count));
      },
      (reason: unknown) =>
      {
        // 内容スクリプトが動かないページ（ブラウザーの設定画面など）では、受け手がいない。
        console.warn(reason);
        linkCount.classList.add("error");
        linkCount.textContent = messageOf("popupCountLinksFailed");
      },
    );
  });

  openOptions.addEventListener("click", () =>
  {
    // 設定画面は別のタブで開くので、開いたらポップアップは閉じる。
    void browser.runtime.openOptionsPage().then(() =>
    {
      window.close();
    });
  });

  // 保存した数は背景が変える。変わったら、ここでも出し直す。
  watchCounter(showCounter);
  showCounter(await loadCounter());
  applyI18n();
}

/**
 * 今のタブのリンクの数を、内容スクリプトに数えてもらう。
 */
async function linkCountOfActiveTab(): Promise<number>
{
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if(tab?.id === undefined)
  {
    throw new Error("今のタブが見つかりません。");
  }
  return messenger.sendToTab(tab.id, "countLinks");
}

// #############################################################################
// MARK: 初期化

void main();
