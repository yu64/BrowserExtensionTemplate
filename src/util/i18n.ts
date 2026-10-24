import { browser } from "wxt/browser";

// #############################################################################
// MARK: 型定義

/**
 * 文言の名前。
 * WXT が public/_locales から作る型（`browser.i18n.getMessage` の引数）をそのまま使う。
 * この部品が、どの拡張の文言ファイルにも結び付かないようにするため。
 */
export type MessageKey = Parameters<typeof browser.i18n.getMessage>[0];

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
