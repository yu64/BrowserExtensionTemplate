import { browser } from "wxt/browser";

// #############################################################################
// MARK: 型定義

/**
 * メッセージの名前。
 * WXT が public/_locales から生成する型（`browser.i18n.getMessage` の引数）をそのまま使用する。
 * このモジュールが、特定の拡張機能のメッセージファイルに依存しないようにするため。
 */
export type MessageKey = Parameters<typeof browser.i18n.getMessage>[0];

// #############################################################################
// MARK: 関数

/**
 * メッセージを、ユーザの言語で取得する。
 * @param substitutions メッセージの中の $1 などに入れる値。
 */
export function messageOf(key: MessageKey, substitutions?: string | string[]): string
{
  return browser.i18n.getMessage(key, substitutions);
}
