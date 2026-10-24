import { isNumber, isUndefined } from "@/util/guards";
import { Messenger } from "@/util/Messenger";

// #############################################################################
// MARK: 型定義

/**
 * この拡張機能で送受信するメッセージの一覧。
 * 種別を追加するときは、ここと、下の `messenger` の検証する関数を追加する。
 */
export type Protocol = {
  /** カウンターの値を1つ増やす。バックグラウンドが担当する。レスポンスは増やした後の値。 */
  incrementCounter: {
    request: undefined;
    response: number;
  };
  /** 開いているページのリンクを数える。コンテンツスクリプトが担当する。 */
  countLinks: {
    request: undefined;
    response: number;
  };
};

// #############################################################################
// MARK: 状態

/**
 * この拡張機能のメッセージを送受信するインスタンス。
 * バックグラウンド・ポップアップ・コンテンツスクリプトのどこからでも、これを使用する。
 */
export const messenger = new Messenger<Protocol>({
  incrementCounter: {
    request: isUndefined,
    response: isNumber,
  },
  countLinks: {
    request: isUndefined,
    response: isNumber,
  },
});
