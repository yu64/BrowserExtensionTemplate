import { beforeEach, describe, expect, it, vi } from "vitest";
import { storage } from "wxt/utils/storage";
import { defaultSettings, SettingsStore } from "./SettingsStore";

/**
 * テストごとに作成し直すインスタンス。
 */
let store = new SettingsStore();

beforeEach(() =>
{
  store = new SettingsStore();
});

describe("SettingsStore.parse", () =>
{
  it("保存済みの値がないときは初期値にする", () =>
  {
    expect(store.parse(null)).toEqual(defaultSettings);
  });

  it("不正な形式の値は初期値にする", () =>
  {
    expect(store.parse("破損した値")).toEqual(defaultSettings);

    expect(store.parse({
      isLinkHighlighted: "yes",
      highlightColor: "red; display: none",
    })).toEqual(defaultSettings);
  });

  it("欠けている項目を初期値で補う", () =>
  {
    expect(store.parse({ isLinkHighlighted: true })).toEqual({
      ...defaultSettings,
      isLinkHighlighted: true,
    });
  });
});

describe("SettingsStore.get", () =>
{
  it("保存済みの値が破損していたら、その項目だけ初期値にする", async () =>
  {
    await storage.setItem("sync:isLinkHighlighted", "yes");
    await storage.setItem("sync:highlightColor", "#123456");

    expect(await store.get()).toEqual({
      isLinkHighlighted: defaultSettings.isLinkHighlighted,
      highlightColor: "#123456",
    });
  });
});

describe("SettingsStore.update", () =>
{
  it("変更した項目だけを保存する", async () =>
  {
    await store.update({ highlightColor: "#000000" });
    await store.update({ isLinkHighlighted: true });

    expect(await store.get()).toEqual({
      isLinkHighlighted: true,
      highlightColor: "#000000",
    });
  });

  it("同時に変更しても、どちらの変更も残る", async () =>
  {
    await Promise.all([
      store.update({ isLinkHighlighted: true }),
      store.update({ highlightColor: "#123456" }),
    ]);

    expect(await store.get()).toEqual({
      isLinkHighlighted: true,
      highlightColor: "#123456",
    });
  });

  it("別のページや端末が同時に別の項目を保存しても、その変更を失わない", async () =>
  {
    // 別のページや端末からの保存を、保存先へ直接保存して再現する。
    await Promise.all([
      store.update({ isLinkHighlighted: true }),
      storage.setItem("sync:highlightColor", "#abcdef"),
    ]);

    expect(await store.get()).toEqual({
      isLinkHighlighted: true,
      highlightColor: "#abcdef",
    });
  });
});

describe("SettingsStore.watch", () =>
{
  it("どの項目が変更されても、全項目がそろった設定で通知する", async () =>
  {
    const onChange = vi.fn();
    const unwatch = store.watch(onChange);

    await store.update({ isLinkHighlighted: true });

    await vi.waitFor(() =>
    {
      expect(onChange).toHaveBeenLastCalledWith({
        ...defaultSettings,
        isLinkHighlighted: true,
      });
    });

    await storage.setItem("sync:highlightColor", "#123456");

    await vi.waitFor(() =>
    {
      expect(onChange).toHaveBeenLastCalledWith({
        isLinkHighlighted: true,
        highlightColor: "#123456",
      });
    });

    unwatch();
  });

  it("監視を終了したら、通知しない", async () =>
  {
    const onChange = vi.fn();
    const unwatch = store.watch(onChange);
    unwatch();

    await store.update({ isLinkHighlighted: true });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(onChange).not.toHaveBeenCalled();
  });
});
