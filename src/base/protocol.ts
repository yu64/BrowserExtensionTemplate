import { defineExtensionMessaging } from "@webext-core/messaging";

// #############################################################################
// MARK: 型定義

/**
 * この拡張機能で送受信するメッセージの一覧。
 * 種別ごとに「(リクエスト) => レスポンス」の形で指定する。リクエストがない種別は、引数を書かない。
 */
export type ProtocolMap = {
  /** カウンターの値を1つ増やす。バックグラウンドが担当する。レスポンスは増やした後の値。 */
  incrementCounter: () => number;
  /** 開いているページのリンクを数える。コンテンツスクリプトが担当する。 */
  countLinks: () => number;
};

// #############################################################################
// MARK: 状態

/**
 * この拡張機能のメッセージを送受信する関数。
 * - `sendMessage(種別, リクエスト)`: バックグラウンドと拡張機能のページへ送信する。
 * - `sendMessage(種別, リクエスト, タブID)`: タブのコンテンツスクリプトへ送信する。
 * - `onMessage(種別, ハンドラー)`: 受信して応答する。受信を終了する関数を返す。
 * 受信側で発生した例外は、送信側の sendMessage の例外になる。
 */
export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
