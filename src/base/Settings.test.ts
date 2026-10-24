import { describe, expect, it, vi } from "vitest";
import { storage } from "wxt/utils/storage";
import { defaultSettings, loadSettings, settingsOf, updateSettings, watchSettings } from "./Settings";

describe("settingsOf", () =>
{
  it("保存がないときは既定値にする", () =>
  {
    expect(settingsOf(null)).toEqual(defaultSettings);
  });

  it("形の違う値は既定値にする", () =>
  {
    expect(settingsOf("壊れた値")).toEqual(defaultSettings);
    expect(settingsOf({
      linksHighlighted: "yes",
      highlightColor: "red; display: none",
    })).toEqual(defaultSettings);
  });

  it("欠けた項目を既定値で埋める", () =>
  {
    expect(settingsOf({ linksHighlighted: true })).toEqual({
      ...defaultSettings,
      linksHighlighted: true,
    });
  });
});

describe("loadSettings", () =>
{
  it("保存した値が壊れていたら、その項目だけ既定値にする", async () =>
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
  it("変えた項目だけを変えて保存する", async () =>
  {
    await updateSettings({ highlightColor: "#000000" });
    await updateSettings({ linksHighlighted: true });

    expect(await loadSettings()).toEqual({
      linksHighlighted: true,
      highlightColor: "#000000",
    });
  });

  it("重なって変えても、どちらの変更も残る", async () =>
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

  it("別のページや端末が同時に違う項目を書いても、その変更を消さない", async () =>
  {
    // 別のページや端末からの書き込みを、保存先へ直に書いてまねる。
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
  it("どの項目が変わっても、欠けのない設定で知らせる", async () =>
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

  it("見張るのをやめたら、知らせない", async () =>
  {
    const onChange = vi.fn();
    const unwatch = watchSettings(onChange);
    unwatch();

    await updateSettings({ linksHighlighted: true });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(onChange).not.toHaveBeenCalled();
  });
});
