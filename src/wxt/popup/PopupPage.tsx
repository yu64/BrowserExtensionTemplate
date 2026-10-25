import { useState } from "react";
import type { ReactNode } from "react";
import { browser } from "wxt/browser";
import { Button } from "@/base/Button";
import type { CounterStore } from "@/base/CounterStore";
import * as protocol from "@/base/protocol";
import * as i18n from "@/util/i18n";
import { useStoredValue } from "@/util/useStoredValue";

// #############################################################################
// MARK: 型定義

/**
 * ポップアップの引数。
 */
export type Props = {
  /** カウンターの保存先。表示と監視に使用する（保存はバックグラウンドが担当する）。 */
  counterStore: CounterStore;
};

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
export function PopupPage({ counterStore }: Props): ReactNode
{
  // カウンターの値はバックグラウンドが変更する。変更されたら、ここでも再描画する。
  const count = useStoredValue(counterStore.get, counterStore.watch);
  const [linkCount, setLinkCount] = useState<LinkCount>({ kind: "none" });
  const [incrementFailed, setIncrementFailed] = useState(false);

  // 保存済みの値を取得するまでは、何も描画しない。
  if(count === undefined) return undefined;

  /**
   * カウンターの値を1つ増やすように、バックグラウンドに依頼する。増えた値は、監視から通知される。
   */
  function increment(): void
  {
    protocol.sendMessage("incrementCounter").then(
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
      <h1 className="text-lg font-bold">{i18n.getMessage("extName")}</h1>

      <section className="grid grid-cols-[1fr_auto] items-center gap-2">
        <span>{i18n.getMessage("popupCounterLabel")}</span>
        <output id="counter" className="text-2xl font-bold tabular-nums">{count}</output>
        <Button id="increment" className="col-span-full" onClick={increment}>
          {i18n.getMessage("popupIncrement")}
        </Button>
      </section>

      <section className="grid gap-2">
        <Button id="count-links" onClick={countLinks}>
          {i18n.getMessage("popupCountLinks")}
        </Button>
        {/* 結果がまだないときに、余白だけが残らないように非表示にする（empty:hidden）。 */}
        <p id="link-count" className={(linkCount.kind === "failed" ? "text-danger empty:hidden" : "empty:hidden")} aria-live="polite">
          {(linkCount.kind === "counted") && i18n.getMessage("popupLinkCount", String(linkCount.count))}
          {(linkCount.kind === "failed") && i18n.getMessage("popupCountLinksFailed")}
        </p>
      </section>

      <p id="error" className="text-danger empty:hidden" role="alert">
        {incrementFailed && i18n.getMessage("popupIncrementFailed")}
      </p>

      <footer>
        <Button id="open-options" variant="link" onClick={openOptions}>
          {i18n.getMessage("popupOpenOptions")}
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
  return protocol.sendMessage("countLinks", undefined, tab.id);
}
