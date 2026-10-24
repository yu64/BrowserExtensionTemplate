import { describe, expect, it } from "vitest";
import { guardedValueOf, isBoolean, isNumber, isRecord, isString, isUndefined } from "./guards";

describe("isRecord", () =>
{
  it("通常のオブジェクトだけを通す", () =>
  {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord("a")).toBe(false);
  });
});

describe("isNumber", () =>
{
  it("有限の数値だけを通す", () =>
  {
    expect(isNumber(0)).toBe(true);
    expect(isNumber(-1.5)).toBe(true);
    expect(isNumber(Number.NaN)).toBe(false);
    expect(isNumber(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isNumber("1")).toBe(false);
  });
});

describe("isString・isBoolean・isUndefined", () =>
{
  it("指定の型の値だけを通す", () =>
  {
    expect(isString("")).toBe(true);
    expect(isString(1)).toBe(false);
    expect(isBoolean(false)).toBe(true);
    expect(isBoolean(0)).toBe(false);
    expect(isUndefined(undefined)).toBe(true);
    expect(isUndefined(null)).toBe(false);
  });
});

describe("guardedValueOf", () =>
{
  it("型に合えばそのまま返す", () =>
  {
    expect(guardedValueOf(3, isNumber, 0)).toBe(3);
  });

  it("型に合わなければ代わりの値を返す", () =>
  {
    expect(guardedValueOf("3", isNumber, 0)).toBe(0);
  });
});
