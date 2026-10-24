// #############################################################################
// MARK: 型定義

/**
 * 値が指定の型かを判定する関数。
 */
export type Guard<TValue> = (value: unknown) => value is TValue;

// #############################################################################
// MARK: 判定

/**
 * 値が、文字列をキーに持つオブジェクトかを判定する。
 * 外部から受け取った値（メッセージなど）の中身を、`as` を使わずに参照するため。
 */
export function isRecord(value: unknown): value is Record<string, unknown>
{
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 値が `undefined` かを判定する。
 * 中身のないリクエストの検証に使用する。
 */
export function isUndefined(value: unknown): value is undefined
{
  return value === undefined;
}

/**
 * 値が有限の数値かを判定する。
 * `NaN` と無限大は、数値として扱わない。
 */
export function isNumber(value: unknown): value is number
{
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * 値が文字列かを判定する。
 */
export function isString(value: unknown): value is string
{
  return typeof value === "string";
}

/**
 * 値が真偽値かを判定する。
 */
export function isBoolean(value: unknown): value is boolean
{
  return typeof value === "boolean";
}

// #############################################################################
// MARK: 取得

/**
 * 値が型に合えばそのまま返し、合わなければ代わりの値を返す。
 * 保存済みの値のように、破損している可能性がある値の取得に使用する。
 */
export function guardedValueOf<TValue>(value: unknown, guard: Guard<TValue>, fallback: TValue): TValue
{
  return (
    (guard(value))
    ? value
    : fallback
  );
}
