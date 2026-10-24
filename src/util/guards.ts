// #############################################################################
// MARK: 型定義

/**
 * 値がその型かを調べる関数。
 */
export type Guard<TValue> = (value: unknown) => value is TValue;

// #############################################################################
// MARK: 調べる

/**
 * 値が、文字列をキーに持つオブジェクトかを調べる。
 * 外から来た値（メッセージなど）の中身を、`as` を使わずに読むため。
 */
export function isRecord(value: unknown): value is Record<string, unknown>
{
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 値が `undefined` かを調べる。
 * 中身のない要求を確かめるときに使う。
 */
export function isUndefined(value: unknown): value is undefined
{
  return value === undefined;
}

/**
 * 値が有限の数かを調べる。
 * `NaN` や無限大は、数えた結果としておかしいので外す。
 */
export function isNumber(value: unknown): value is number
{
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * 値が文字列かを調べる。
 */
export function isString(value: unknown): value is string
{
  return typeof value === "string";
}

/**
 * 値が真偽かを調べる。
 */
export function isBoolean(value: unknown): value is boolean
{
  return typeof value === "boolean";
}

// #############################################################################
// MARK: 読み取る

/**
 * 値が型に合えばそのまま、合わなければ代わりの値を返す。
 * 保存した値のように、壊れているかもしれない値を読むときに使う。
 */
export function guardedValueOf<TValue>(value: unknown, guard: Guard<TValue>, fallback: TValue): TValue
{
  return (
    (guard(value))
    ? value
    : fallback
  );
}
