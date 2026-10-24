import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { badgeTextOf, incrementCounter, loadCounter, watchCounter } from "@/base/Counter";
import { messenger } from "@/base/protocol";

// #############################################################################
// MARK: 内部関数

/**
 * バックグラウンドの処理。
 * MV3 のバックグラウンド（Service Worker）は、すぐに停止し、必要なときに再起動する。起動のたびにここが実行されるので、リスナーは毎回同期的に登録する。
 */
function main(): void
{
  messenger.listen({ incrementCounter });

  // カウンターの値が変更されたら、変更元に関係なくバッジに表示する。
  watchCounter(showBadge);
  void loadCounter().then(showBadge);
}

/**
 * カウンターの値を、ツールバーのボタンのバッジに表示する。
 */
function showBadge(count: number): void
{
  // MV2（Firefox の初期設定）には action がなく、browserAction を使用するため分岐する。
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
 * バックグラウンドのエントリポイント。WXT が default export を求めるため、default export にする。
 */
export default defineBackground(main);
