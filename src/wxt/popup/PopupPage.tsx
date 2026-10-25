import { useState } from "react";
import type { ReactNode } from "react";
import { browser } from "wxt/browser";
import { Button } from "@/base/Button";
import { getCounter, watchCounter } from "@/base/Counter";
import { sendMessage } from "@/base/protocol";
import { getMessage } from "@/util/i18n";
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
 * 保存済みのカウンターの値を取得するまでは、何も描画しない。描画した時点で、どのボタンも使用できる状態にするため。
 */
export function PopupPage(): ReactNode
{
  // カウンターの値はバックグラウンドが変更する。変更されたら、ここでも再描画する。
  const count = useStoredValue(getCounter, watchCounter);
  const [linkCount, setLinkCount] = useState<LinkCount>({ kind: "none" });
  const [incrementFailed, setIncrementFailed] = useState(false);

  if(count === undefined) return undefined;

  /**
   * カウンターの値を1つ増やすように、バックグラウンドに依頼する。増えた値は、監視から通知される。
   */
  function increment(): void
  {
    sendMessage("incrementCounter").then(
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
   * 現在のタブのリンクを数える。
   */
  function countLinks(): void
  {
    countLinksInActiveTab().then(
      (counted) =>
      {
        setLinkCount({
          kind: "counted",
          count: counted,
        });
      },
      (reason: unknown) =>
      {
        // コンテンツスクリプトが動作しないページ（ブラウザの設定画面など）では、リスナーがいない。
        console.warn(reason);
        setLinkCount({ kind: "failed" });
      },
    );
  }

  /**
   * 設定画面を開く。別のタブで開くので、開いたらポップアップを閉じる。
   */
  function openOptions(): void
  {
    void browser.runtime.openOptionsPage().then(() =>
    {
      window.close();
    });
  }

  return (
    <main className="grid w-[280px] gap-4 p-4">
      <h1 className="text-lg font-bold">{getMessage("extName")}</h1>

      <section className="grid grid-cols-[1fr_auto] items-center gap-2">
        <span>{getMessage("popupCounterLabel")}</span>
        <output id="counter" className="text-2xl font-bold tabular-nums">{count}</output>
        <Button id="increment" className="col-span-full" onClick={increment}>
          {getMessage("popupIncrement")}
        </Button>
      </section>

      <section className="grid gap-2">
        <Button id="count-links" onClick={countLinks}>
          {getMessage("popupCountLinks")}
        </Button>
        {/* 結果がまだないときに、余白だけが残らないように非表示にする（empty:hidden）。 */}
        <p id="link-count" className={(linkCount.kind === "failed" ? "text-danger empty:hidden" : "empty:hidden")} aria-live="polite">
          {(linkCount.kind === "counted") && getMessage("popupLinkCount", String(linkCount.count))}
          {(linkCount.kind === "failed") && getMessage("popupCountLinksFailed")}
        </p>
      </section>

      <p id="error" className="text-danger empty:hidden" role="alert">
        {incrementFailed && getMessage("popupIncrementFailed")}
      </p>

      <footer>
        <Button id="open-options" variant="link" onClick={openOptions}>
          {getMessage("popupOpenOptions")}
        </Button>
      </footer>
    </main>
  );
}

// #############################################################################
// MARK: 内部関数

/**
 * 現在のタブのリンクの数を、コンテンツスクリプトに数えさせる。
 */
async function countLinksInActiveTab(): Promise<number>
{
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if(tab?.id === undefined) throw new Error("現在のタブが見つかりません。");
  return sendMessage("countLinks", undefined, tab.id);
}
