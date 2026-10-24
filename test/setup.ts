import { beforeEach } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

// #############################################################################
// MARK: 初期化

// テストの間で、保存済みの値やリスナーが残らないようにする。
beforeEach(() =>
{
  fakeBrowser.reset();
});
