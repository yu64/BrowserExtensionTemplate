import { elementOf } from "@/util/dom";
import { applyI18n, messageOf } from "@/util/i18n";
import { loadSettings, updateSettings, watchSettings } from "@/base/Settings";
import type { Settings } from "@/base/Settings";

// #############################################################################
// MARK: 定数

/**
 * 「保存しました」を出しておく時間（ミリ秒）。
 */
const statusDuration = 2000;

// #############################################################################
// MARK: 内部関数

/**
 * 設定画面の本体。
 * 入力を変えたらすぐ保存する。保存の押し忘れをなくすため。
 * 操作を受け付けられるようにし、保存した値を出してから、最後に文言を入れる。
 * 文言が入ったときには使える状態になっているので、保存した値を出す前に入力されることがない。
 */
async function main(): Promise<void>
{
  const linksHighlighted = elementOf("#links-highlighted", HTMLInputElement);
  const highlightColor = elementOf("#highlight-color", HTMLInputElement);
  const status = elementOf("#status", HTMLParagraphElement);
  let statusTimer: number | undefined;

  /**
   * 設定を入力欄に出す。
   */
  function showSettings(settings: Settings): void
  {
    linksHighlighted.checked = settings.linksHighlighted;
    highlightColor.value = settings.highlightColor;
  }

  /**
   * 設定の一部を保存して、保存できたかを知らせる。
   */
  async function save(patch: Partial<Settings>): Promise<void>
  {
    try
    {
      await updateSettings(patch);
      status.classList.remove("error");
      status.textContent = messageOf("optionsSaved");
    }
    catch(reason)
    {
      // sync の書き込みは、回数や大きさの上限で断られることがある。
      console.error(reason);
      status.classList.add("error");
      status.textContent = messageOf("optionsSaveFailed");
      return;
    }
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() =>
    {
      status.textContent = "";
    }, statusDuration);
  }

  linksHighlighted.addEventListener("change", () =>
  {
    void save({ linksHighlighted: linksHighlighted.checked });
  });
  // 色は選ぶ間に何度も変わるので、選び終えたとき（change）だけ保存する。
  highlightColor.addEventListener("change", () =>
  {
    void save({ highlightColor: highlightColor.value });
  });

  // 別の端末やタブで変えたときも、出し直す。
  watchSettings(showSettings);
  showSettings(await loadSettings());
  applyI18n();
}

// #############################################################################
// MARK: 初期化

void main();
