import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { badgeTextOf, incrementCounter, loadCounter, watchCounter } from "@/base/Counter";
import { messenger } from "@/base/protocol";

// #############################################################################
// MARK: 内部関数

/**
 * 背景の本体。
 * MV3 の背景はすぐ止まり、また起きる。起きるたびにここが動くので、受け手は毎回同期で登録する。
 */
function main(): void
{
  messenger.listen({ incrementCounter });

  // 数が変わったら、どこで変えたかに関わらずバッジに出す。
  watchCounter(showBadge);
  void loadCounter().then(showBadge);
}

/**
 * 数をツールバーのボタンのバッジに出す。
 */
function showBadge(count: number): void
{
  // MV2（Firefox の既定）には action がなく、browserAction を使うため分ける。
  const action = (
    (import.meta.env.MANIFEST_VERSION === 3)
    ? browser.action
    : browser.browserAction
  );
  void action.setBadgeText({ text: badgeTextOf(count) });
}

// #############################################################################
// MARK: 初期化

/**
 * 背景の入り口。WXT が既定の書き出しを求めるため、default export にする。
 */
export default defineBackground(main);
