import { browser } from "wxt/browser";

// #############################################################################
// MARK: 型定義

/**
 * 文言の名前。
 * WXT が public/_locales から作る型（`browser.i18n.getMessage` の引数）をそのまま使う。
 * この部品が、どの拡張の文言ファイルにも結び付かないようにするため。
 */
export type MessageKey = Parameters<typeof browser.i18n.getMessage>[0];

/**
 * 名前を文字列のまま受ける、文言の引き方。
 * HTML の属性から読んだ名前は、型で絞れないために使う。
 */
type LooseI18n = {
  getMessage(name: string, substitutions?: string | string[]): string;
};

// #############################################################################
// MARK: 定数

/**
 * 要素の中身に入れる文言の名前を書く属性。
 * 例: `<h1 data-i18n="extName"></h1>`
 */
const textAttribute = "data-i18n";

/**
 * 要素の lang 属性に入れる文言の名前を書く属性。
 * 実際に使われた言語のファイルから引くので、利用者の言語のファイルがなく、既定の言語で出したときも正しい言語を示せる。
 * 例: `<html data-i18n-lang="htmlLang">`
 */
const langAttribute = "data-i18n-lang";

// #############################################################################
// MARK: 関数

/**
 * 文言を、利用者の言語で引く。
 * @param substitutions 文言の中の $1 などに入れる値。
 */
export function messageOf(key: MessageKey, substitutions?: string | string[]): string
{
  return browser.i18n.getMessage(key, substitutions);
}

/**
 * `data-i18n`・`data-i18n-lang` 属性の付いた要素に、文言を入れる。
 * HTML に文言を直に書かずに、言語ごとのファイルにまとめるため。
 */
export function applyI18n(root: ParentNode = document): void
{
  for(const element of elementsOf(root, textAttribute))
  {
    element.textContent = looseMessageOf(element.getAttribute(textAttribute));
  }
  for(const element of elementsOf(root, langAttribute))
  {
    element.setAttribute("lang", looseMessageOf(element.getAttribute(langAttribute)));
  }
}

// #############################################################################
// MARK: 内部関数

/**
 * 属性の付いた要素を集める。root そのものに属性があれば、それも含める。
 * `<html>` に付けた `data-i18n-lang` も拾えるようにするため。
 */
function elementsOf(root: ParentNode, attribute: string): Element[]
{
  const descendants = [...root.querySelectorAll(`[${attribute}]`)];
  if(root instanceof Element && root.hasAttribute(attribute)) return [root, ...descendants];
  return descendants;
}

/**
 * 名前が文字列のまま、文言を引く。
 * 名前の書き間違いに早く気づけるように、文言が見つからなければ例外を投げる。
 * ブラウザーは、知らない名前には空の文字列を返すため、それで見分ける。
 */
function looseMessageOf(name: string | null): string
{
  const i18n: LooseI18n = browser.i18n;
  const message = i18n.getMessage(name ?? "");
  if(message === "")
  {
    throw new Error(`文言がありません: ${name ?? "（名前なし）"}`);
  }
  return message;
}
