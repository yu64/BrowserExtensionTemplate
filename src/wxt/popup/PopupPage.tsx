import { useState } from "react";
import type { ReactNode } from "react";
import { browser } from "wxt/browser";
import { loadCounter, watchCounter } from "@/base/Counter";
import { messenger } from "@/base/protocol";
import { messageOf } from "@/util/i18n";
import { useStoredValue } from "@/util/useStoredValue";

// #############################################################################
// MARK: 型定義

/**
 * リンクを数えた結果。
 */
type LinkCount = (
  | { kind: "none" }
  | {
    kind: "counted",
    count: number,
  }
  | { kind: "failed" }
);

// #############################################################################
// MARK: コンポーネント

/**
 * ポップアップ。
 * 保存した数を読み終えるまでは何も描かない。描いたときには、どのボタンも使える状態にするため。
 */
export function PopupPage(): ReactNode
{
  // 数は背景が変える。変わったら、ここでも描き直す。
  const count = useStoredValue(loadCounter, watchCounter);
  const [linkCount, setLinkCount] = useState<LinkCount>({ kind: "none" });
  const [incrementFailed, setIncrementFailed] = useState(false);

  if(count === undefined) return undefined;

  /**
   * 数を1つ増やすよう、背景に頼む。増えた数は、見張りから届く。
   */
  function increment(): void
  {
    messenger.send("incrementCounter").then(
      () =>
      {
        setIncrementFailed(false);
      },
      (reason: unknown) =>
      {
        console.error(reason);
        setIncrementFailed(true);
      },
    );
  }

  /**
   * 今のタブのリンクを数える。
   */
  function countLinks(): void
  {
    linkCountOfActiveTab().then(
      (counted) =>
      {
        setLinkCount({
          kind: "counted",
          count: counted,
        });
      },
      (reason: unknown) =>
      {
        // 内容スクリプトが動かないページ（ブラウザーの設定画面など）では、受け手がいない。
        console.warn(reason);
        setLinkCount({ kind: "failed" });
      },
    );
  }

  /**
   * 設定画面を開く。別のタブで開くので、開いたらポップアップは閉じる。
   */
  function openOptions(): void
  {
    void browser.runtime.openOptionsPage().then(() =>
    {
      window.close();
    });
  }

  return (
    <main className="popup">
      <h1>{messageOf("extName")}</h1>

      <section className="counter">
        <span>{messageOf("popupCounterLabel")}</span>
        <output id="counter">{count}</output>
        <button id="increment" type="button" onClick={increment}>
          {messageOf("popupIncrement")}
        </button>
      </section>

      <section className="links">
        <button id="count-links" type="button" onClick={countLinks}>
          {messageOf("popupCountLinks")}
        </button>
        <p id="link-count" className={(linkCount.kind === "failed" ? "error" : undefined)} aria-live="polite">
          {(linkCount.kind === "counted") && messageOf("popupLinkCount", String(linkCount.count))}
          {(linkCount.kind === "failed") && messageOf("popupCountLinksFailed")}
        </p>
      </section>

      <p id="error" className="error" role="alert">
        {incrementFailed && messageOf("popupIncrementFailed")}
      </p>

      <footer>
        <button id="open-options" type="button" className="link" onClick={openOptions}>
          {messageOf("popupOpenOptions")}
        </button>
      </footer>
    </main>
  );
}

// #############################################################################
// MARK: 内部関数

/**
 * 今のタブのリンクの数を、内容スクリプトに数えてもらう。
 */
async function linkCountOfActiveTab(): Promise<number>
{
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if(tab?.id === undefined) throw new Error("今のタブが見つかりません。");
  return messenger.sendToTab(tab.id, "countLinks");
}
