import { describe, expect, it, vi } from "vitest";
import { storage } from "wxt/utils/storage";
import { toBadgeText, toCount, incrementCounter, getCounter, watchCounter } from "./Counter";

describe("toBadgeText", () =>
{
  it("0 のときは空文字にする", () =>
  {
    expect(toBadgeText(0)).toBe("");
  });

  it("99 まではそのまま表示する", () =>
  {
    expect(toBadgeText(1)).toBe("1");
    expect(toBadgeText(99)).toBe("99");
  });

  it("99 を超えたら 99+ にする", () =>
  {
    expect(toBadgeText(100)).toBe("99+");
  });
});

describe("toCount", () =>
{
  it("0 以上の整数はそのまま返す", () =>
  {
    expect(toCount(0)).toBe(0);
    expect(toCount(42)).toBe(42);
  });

  it("不正な形式の値は 0 にする", () =>
  {
    expect(toCount("5")).toBe(0);
    expect(toCount(-1)).toBe(0);
    expect(toCount(1.5)).toBe(0);
    expect(toCount(null)).toBe(0);
  });
});

describe("incrementCounter", () =>
{
  it("保存済みの値がないときは 0 から増やす", async () =>
  {
    expect(await incrementCounter()).toBe(1);
    expect(await getCounter()).toBe(1);
  });

  it("保存済みの値から増やす", async () =>
  {
    await storage.setItem("local:counter", 41);
    expect(await incrementCounter()).toBe(42);
  });

  it("保存済みの値が破損していたら、0 から増やし直す", async () =>
  {
    await storage.setItem("local:counter", "5");
    expect(await incrementCounter()).toBe(1);
  });

  it("同時に呼び出しても、呼び出した回数だけ増える", async () =>
  {
    const results = await Promise.all([incrementCounter(), incrementCounter(), incrementCounter()]);

    expect(results).toEqual([1, 2, 3]);
    expect(await getCounter()).toBe(3);
  });
});

describe("watchCounter", () =>
{
  it("変更されたら、検証済みの値で通知する", async () =>
  {
    const onChange = vi.fn();
    const unwatch = watchCounter(onChange);

    await storage.setItem("local:counter", "破損した値");
    await incrementCounter();
    unwatch();

    expect(onChange).toHaveBeenNthCalledWith(1, 0);
    expect(onChange).toHaveBeenNthCalledWith(2, 1);
  });
});
