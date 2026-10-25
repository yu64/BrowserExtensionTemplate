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
 */
const countSchema = z.catch(z.int().check(z.gte(0)), 0);

// #############################################################################
// MARK: 状態

/**
 * カウンターの値（ボタンを押した回数）。
 * 端末ごとの値でよいので、同期しない local に保存する。
 * 取得した値は、toCount で形式を検証してから使用する。
 */
const counterItem = storage.defineItem<number>("local:counter", { fallback: 0 });

/**
 * カウンターの保存を順番に実行するキュー。連続で押されても、増やした分が失われないようにするため。
 */
const counterQueue = new SerialQueue();

// #############################################################################
// MARK: 関数

/**
 * 保存済みのカウンターの値を取得する。
 */
export async function getCounter(): Promise<number>
{
  return toCount(await counterItem.getValue());
}

/**
 * カウンターの値を1つ増やして保存する。
 * キューは、それぞれのページやバックグラウンドの中でしか機能しない。保存が重ならないように、バックグラウンドからだけ呼び出す。
 * @returns 増やした後の値。
 */
export function incrementCounter(): Promise<number>
{
  return counterQueue.run(async () =>
  {
    const next = await getCounter() + 1;
    await counterItem.setValue(next);
    return next;
  });
}

/**
 * カウンターの値の変更を監視する。
 * @returns 監視を終了する関数。
 */
export function watchCounter(onChange: (count: number) => void): () => void
{
  return counterItem.watch((stored) =>
  {
    onChange(toCount(stored));
  });
}

/**
 * 保存済みの値から、カウンターの値を取得する。
 * 0 以上の整数でなければ 0 にする。破損した値のまま加算すると、文字列が連結されるなどして、増やせなくなるため。
 */
export function toCount(stored: unknown): number
{
  return countSchema.parse(stored);
}

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
