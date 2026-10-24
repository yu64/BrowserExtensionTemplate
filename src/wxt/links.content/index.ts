import "./style.css";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { defineContentScript } from "wxt/utils/define-content-script";
import { messenger } from "@/base/protocol";
import { loadSettings, watchSettings } from "@/base/Settings";
import type { Settings } from "@/base/Settings";

// #############################################################################
// MARK: 定数

/**
 * 枠を出すときに html 要素へ付ける属性。style.css と名前をそろえる。
 * ページ側の名前とぶつからないように、拡張の名前を頭に付ける。
 */
const highlightAttribute = "data-extension-template-highlight";

/**
 * 枠の色を渡す CSS の変数。style.css と名前をそろえる。
 */
const highlightColorProperty = "--extension-template-highlight-color";

/**
 * 数えて枠を付けるリンク。style.css とそろえる。
 * 行き先（href）のない a は、リンクとして働かないので外す。
 */
const linkSelector = "a[href]";

// #############################################################################
// MARK: 内部関数

/**
 * 内容スクリプトの本体。
 */
async function main(ctx: ContentScriptContext): Promise<void>
{
  // 受け手は先に登録する。設定を読む間に来たメッセージも受けるため。
  // onInvalidated は、拡張を更新するなどして、同じページに新しい内容スクリプトが入ったときに呼ばれる。
  // そのとき古いほうを片付けて、2つが同時に答えたり枠を書き換えたりしないようにする。
  // 拡張を止めたり消したりしただけでは呼ばれないので、そのときの枠は、ページを開き直すまで残る。
  ctx.onInvalidated(messenger.listen({ countLinks: () => document.querySelectorAll(linkSelector).length }));

  // 見張りを先に始める。読み込む間に設定が変わっても、取りこぼさないようにするため。
  ctx.onInvalidated(watchSettings(applyHighlight));
  ctx.onInvalidated(clearHighlight);
  const settings = await loadSettings();
  // 読み込む間に新しい内容スクリプトに代わっていたら、古いほうは何もしない。
  if(ctx.isInvalid) return;
  applyHighlight(settings);
}

/**
 * 設定に合わせて、リンクの枠を出したり消したりする。
 */
function applyHighlight(settings: Settings): void
{
  const root = document.documentElement;
  root.toggleAttribute(highlightAttribute, settings.linksHighlighted);
  root.style.setProperty(highlightColorProperty, settings.highlightColor);
}

/**
 * リンクの枠を消し、ページに付けたものを取り除く。
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
 * 内容スクリプトの入り口。WXT が既定の書き出しを求めるため、default export にする。
 */
export default defineContentScript({
  // ひな形として、どのページでも試せるようにする。使うときは必要なページだけに絞る。
  matches: ["<all_urls>"],
  main,
});
