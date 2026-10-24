import { isNumber, isUndefined } from "@/util/guards";
import { Messenger } from "@/util/Messenger";

// #############################################################################
// MARK: 型定義

/**
 * この拡張でやり取りするメッセージの一覧。
 * 種類を足すときは、ここと下の `messenger` の確かめる関数を足す。
 */
export type Protocol = {
  /** 数を1つ増やす。背景が受け持つ。返答は増やした後の数。 */
  incrementCounter: {
    request: undefined;
    response: number;
  };
  /** 開いているページのリンクを数える。内容スクリプトが受け持つ。 */
  countLinks: {
    request: undefined;
    response: number;
  };
};

// #############################################################################
// MARK: 状態

/**
 * この拡張のメッセージを送り受けする窓口。
 * 背景・ポップアップ・内容スクリプトのどこからでも、これを使う。
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
