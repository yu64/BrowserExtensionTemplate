import "./style.css";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { defineContentScript } from "wxt/utils/define-content-script";
import { messenger } from "@/base/protocol";
import { loadSettings, watchSettings } from "@/base/Settings";
import type { Settings } from "@/base/Settings";

// #############################################################################
// MARK: 定数

/**
 * 枠を表示するときに html 要素へ設定する属性。style.css と名前を合わせる。
 * ページ側の名前と衝突しないように、拡張機能の名前を先頭に付ける。
 */
const highlightAttribute = "data-extension-template-highlight";

/**
 * 枠の色を渡す CSS 変数。style.css と名前を合わせる。
 */
const highlightColorProperty = "--extension-template-highlight-color";

/**
 * 数えて枠を付けるリンクのセレクター。style.css と合わせる。
 * リンク先（href）のない a は、リンクとして機能しないので除外する。
 */
const linkSelector = "a[href]";

// #############################################################################
// MARK: 内部関数

/**
 * コンテンツスクリプトの処理。
 */
async function main(ctx: ContentScriptContext): Promise<void>
{
  // リスナーは先に登録する。設定の取得中に届いたメッセージも受信するため。
  // onInvalidated は、拡張機能の更新などで、同じページに新しいコンテンツスクリプトが読み込まれたときに呼び出される。
  // そのとき古いほうを後処理して、2つが同時に応答したり、枠を書き換えたりしないようにする。
  // 拡張機能の無効化やアンインストールだけでは呼び出されないので、その場合の枠は、ページを再読み込みするまで残る。
  ctx.onInvalidated(messenger.listen({ countLinks: () => document.querySelectorAll(linkSelector).length }));

  // 監視を先に開始する。取得中に設定が変更されても、取りこぼさないようにするため。
  ctx.onInvalidated(watchSettings(applyHighlight));
  ctx.onInvalidated(clearHighlight);
  const settings = await loadSettings();
  // 取得中に新しいコンテンツスクリプトに置き換わっていたら、古いほうは何もしない。
  if(ctx.isInvalid) return;
  applyHighlight(settings);
}

/**
 * 設定に合わせて、リンクの枠を表示・非表示にする。
 */
function applyHighlight(settings: Settings): void
{
  const root = document.documentElement;
  root.toggleAttribute(highlightAttribute, settings.linksHighlighted);
  root.style.setProperty(highlightColorProperty, settings.highlightColor);
}

/**
 * リンクの枠を非表示にし、ページに設定した属性と変数を削除する。
 */
function clearHighlight(): void
{
  const root = document.documentElement;
  root.removeAttribute(highlightAttribute);
  root.style.removeProperty(highlightColorProperty);
}

// #############################################################################
// MARK: 初期化

/**
 * コンテンツスクリプトのエントリポイント。WXT が default export を求めるため、default export にする。
 */
export default defineContentScript({
  // テンプレートとして、どのページでも試せるようにする。実際に使うときは、必要なページだけに限定する。
  matches: ["<all_urls>"],
  main,
});
