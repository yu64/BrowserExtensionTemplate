import { storage } from "wxt/utils/storage";
import { z } from "zod/mini";
import { SerialQueue } from "@/util/SerialQueue";

// #############################################################################
// MARK: 定数

/**
 * バッジにそのまま表示できる最大の数。
 * バッジには4文字程度しか入らないため、これを超えたら「99+」にする。
 */
const badgeMax = 99;

/**
 * カウンターの値の形式。0 以上の整数でなければ 0 にする。
 * 破損した値のまま加算すると、文字列が連結されるなどして、増やせなくなるため。
 */
const countSchema = z.catch(z.int().check(z.gte(0)), 0);

// #############################################################################
// MARK: クラス

/**
 * カウンター（ボタンを押した回数）の保存先。
 * 端末ごとの値でよいので、同期しない local に保存する。
 * インスタンスは、使用するエントリポイントが作成する。
 */
export class CounterStore
{
  readonly #item = storage.defineItem<number>("local:counter", { fallback: 0 });

  /**
   * カウンターの保存を順番に実行するキュー。連続で押されても、増やした分が失われないようにするため。
   */
  readonly #queue = new SerialQueue();

  /**
   * 保存済みのカウンターの値を取得する。
   */
  public get = async (): Promise<number> =>
  {
    return this.parse(await this.#item.getValue());
  };

  /**
   * カウンターの値を1つ増やして保存する。
   * キューは、同じインスタンスの中でしか機能しない。保存が重ならないように、バックグラウンドの1つのインスタンスからだけ呼び出す。
   * @returns 増やした後の値。
   */
  public increment = (): Promise<number> =>
  {
    return this.#queue.run(async () =>
    {
      const next = await this.get() + 1;
      await this.#item.setValue(next);
      return next;
    });
  };

  /**
   * カウンターの値の変更を監視する。
   * @returns 監視を終了する関数。
   */
  public watch = (onChange: (count: number) => void): () => void =>
  {
    return this.#item.watch((stored) =>
    {
      onChange(this.parse(stored));
    });
  };

  /**
   * 保存済みの値から、カウンターの値を取得する。0 以上の整数でなければ 0 にする。
   */
  public parse = (stored: unknown): number =>
  {
    return countSchema.parse(stored);
  };
}

// #############################################################################
// MARK: 関数

/**
 * カウンターの値から、バッジに表示する文字列を作成する。
 * 0 のときは、バッジを非表示にするために空文字にする。
 */
export function toBadgeText(count: number): string
{
  if(count <= 0) return "";
  return (
    (count > badgeMax)
    ? `${String(badgeMax)}+`
    : String(count)
  );
}
