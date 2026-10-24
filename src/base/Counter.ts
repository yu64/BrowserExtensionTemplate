import { storage } from "wxt/utils/storage";
import { guardedValueOf } from "@/util/guards";
import { SerialQueue } from "@/util/SerialQueue";

// #############################################################################
// MARK: 定数

/**
 * バッジにそのまま出せる最大の数。
 * バッジには4文字ほどしか入らないため、これを超えたら「99+」にする。
 */
const badgeMax = 99;

// #############################################################################
// MARK: 状態

/**
 * 数えた回数。
 * 端末ごとの値でよいので、同期しない local に置く。
 * 読んだ値は、counterOf で形を確かめてから使う。
 */
const counterItem = storage.defineItem<number>("local:counter", { fallback: 0 });

/**
 * 数を書き込む順番待ち。続けて押されても、増やした分が消えないようにするため。
 */
const counterQueue = new SerialQueue();

// #############################################################################
// MARK: 関数

/**
 * 保存した数を読む。
 */
export async function loadCounter(): Promise<number>
{
  return counterOf(await counterItem.getValue());
}

/**
 * 数を1つ増やして保存する。
 * 順番待ちは、それぞれのページや背景の中でしか効かない。書き込みが重ならないように、背景からだけ呼ぶ。
 * @returns 増やした後の数。
 */
export function incrementCounter(): Promise<number>
{
  return counterQueue.run(async () =>
  {
    const next = await loadCounter() + 1;
    await counterItem.setValue(next);
    return next;
  });
}

/**
 * 数が変わるのを見張る。
 * @returns 見張るのをやめる関数。
 */
export function watchCounter(onChange: (count: number) => void): () => void
{
  return counterItem.watch((stored) =>
  {
    onChange(counterOf(stored));
  });
}

/**
 * 保存した値から、数を作る。
 * 0 以上の整数でなければ 0 にする。壊れた値のまま足し算すると、文字列がつながるなどして、増やせなくなるため。
 */
export function counterOf(stored: unknown): number
{
  return guardedValueOf(stored, isCount, 0);
}

/**
 * 数から、バッジに出す文字を作る。
 * 0 のときは、バッジを消すために空にする。
 */
export function badgeTextOf(count: number): string
{
  if(count <= 0) return "";
  return (
    (count > badgeMax)
    ? `${String(badgeMax)}+`
    : String(count)
  );
}

// #############################################################################
// MARK: 内部関数

/**
 * 値が、数えた回数として正しい形（0 以上の整数）かを調べる。
 */
function isCount(value: unknown): value is number
{
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
