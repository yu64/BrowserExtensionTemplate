import { describe, expect, it, vi } from "vitest";
import { storage } from "wxt/utils/storage";
import { defaultSettings, loadSettings, settingsOf, updateSettings, watchSettings } from "./Settings";

describe("settingsOf", () =>
{
  it("保存済みの値がないときは初期値にする", () =>
  {
    expect(settingsOf(null)).toEqual(defaultSettings);
  });

  it("不正な形式の値は初期値にする", () =>
  {
    expect(settingsOf("破損した値")).toEqual(defaultSettings);
    expect(settingsOf({
      linksHighlighted: "yes",
      highlightColor: "red; display: none",
    })).toEqual(defaultSettings);
  });

  it("欠けている項目を初期値で補う", () =>
  {
    expect(settingsOf({ linksHighlighted: true })).toEqual({
      ...defaultSettings,
      linksHighlighted: true,
    });
  });
});

describe("loadSettings", () =>
{
  it("保存済みの値が破損していたら、その項目だけ初期値にする", async () =>
  {
    await storage.setItem("sync:linksHighlighted", "yes");
    await storage.setItem("sync:highlightColor", "#123456");

    expect(await loadSettings()).toEqual({
      linksHighlighted: defaultSettings.linksHighlighted,
      highlightColor: "#123456",
    });
  });
});

describe("updateSettings", () =>
{
  it("変更した項目だけを保存する", async () =>
  {
    await updateSettings({ highlightColor: "#000000" });
    await updateSettings({ linksHighlighted: true });

    expect(await loadSettings()).toEqual({
      linksHighlighted: true,
      highlightColor: "#000000",
    });
  });

  it("同時に変更しても、どちらの変更も残る", async () =>
  {
    await Promise.all([
      updateSettings({ linksHighlighted: true }),
      updateSettings({ highlightColor: "#123456" }),
    ]);

    expect(await loadSettings()).toEqual({
      linksHighlighted: true,
      highlightColor: "#123456",
    });
  });

  it("別のページや端末が同時に別の項目を保存しても、その変更を失わない", async () =>
  {
    // 別のページや端末からの保存を、保存先へ直接保存して再現する。
    await Promise.all([
      updateSettings({ linksHighlighted: true }),
      storage.setItem("sync:highlightColor", "#abcdef"),
    ]);

    expect(await loadSettings()).toEqual({
      linksHighlighted: true,
      highlightColor: "#abcdef",
    });
  });
});

describe("watchSettings", () =>
{
  it("どの項目が変更されても、全項目がそろった設定で通知する", async () =>
  {
    const onChange = vi.fn();
    const unwatch = watchSettings(onChange);

    await updateSettings({ linksHighlighted: true });
    await vi.waitFor(() =>
    {
      expect(onChange).toHaveBeenLastCalledWith({
        ...defaultSettings,
        linksHighlighted: true,
      });
    });

    await storage.setItem("sync:highlightColor", "#123456");
    await vi.waitFor(() =>
    {
      expect(onChange).toHaveBeenLastCalledWith({
        linksHighlighted: true,
        highlightColor: "#123456",
      });
    });
    unwatch();
  });

  it("監視を終了したら、通知しない", async () =>
  {
    const onChange = vi.fn();
    const unwatch = watchSettings(onChange);
    unwatch();

    await updateSettings({ linksHighlighted: true });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(onChange).not.toHaveBeenCalled();
  });
});
