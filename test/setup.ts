import { beforeEach } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

// #############################################################################
// MARK: 初期化

// 試験の間で、保存した値や受け手が残らないようにする。
beforeEach(() =>
{
  fakeBrowser.reset();
});
