import { storage } from "wxt/utils/storage";
import type { WxtStorageItem } from "wxt/utils/storage";
import { getValidValue, isBoolean, isRecord } from "@/util/guards";
import type { Guard } from "@/util/guards";
import { SerialQueue } from "@/util/SerialQueue";

// #############################################################################
// MARK: 型定義

/**
 * ユーザが設定画面で変更する値。
 * 項目を追加するときは、ここと、下の defaultSettings・settingItems・settingGuards に追加する。
 */
export type Settings = {
  /** ページのリンクを、枠で囲んで表示するか。 */
  isLinkHighlighted: boolean;
  /** 枠の色。`#rrggbb` の形式で保持する。色の入力欄が返す形式に合わせるため。 */
  highlightColor: string;
};

/**
 * 設定の項目ごとの保存先。
 */
type SettingItems = {
  [TKey in keyof Settings]: WxtStorageItem<Settings[TKey], Record<string, unknown>>;
};

// #############################################################################
// MARK: 定数

/**
 * 何も保存されていないときの設定（初期値）。
 */
export const defaultSettings: Settings = {
  isLinkHighlighted: false,
  highlightColor: "#e8590c",
};

/**
 * 設定の項目ごとの、保存済みの値の形式を検証する関数。
 */
const settingGuards: { [TKey in keyof Settings]: Guard<Settings[TKey]> } = {
  isLinkHighlighted: isBoolean,
  highlightColor: isHexColor,
};

// #############################################################################
// MARK: 状態

/**
 * 設定の保存先。同じユーザの別の端末とも同期するように、sync に保存する。
 *
 * 項目ごとに別のキーで保存する。1つのオブジェクトで保存すると、変更のたびに「全体を取得し、1項目を変更し、全体を保存する」ことになる。
 * その場合、別のタブや端末でほぼ同時に別の項目を変更すると、後から保存したほうが先の変更を古い値で上書きしてしまうため。
 * 同じ項目を同時に変更したときは、後から変更したほうが残る。
 *
 * 取得した値は、toSettings で形式を検証してから使用する。
 * 項目の形式を変更するときは、その項目に version と migrations を指定する。例えば、色を `#rrggbb` から色名に変更する場合:
 * `storage.defineItem<string>("sync:highlightColor", { fallback: "orange", version: 2, migrations: { 2: toColorName } })`
 */
const settingItems: SettingItems = {
  isLinkHighlighted: storage.defineItem<boolean>("sync:isLinkHighlighted", { fallback: defaultSettings.isLinkHighlighted }),
  highlightColor: storage.defineItem<string>("sync:highlightColor", { fallback: defaultSettings.highlightColor }),
};

/**
 * 設定の項目名の一覧。
 */
const settingKeys: (keyof Settings)[] = ["isLinkHighlighted", "highlightColor"];

// #############################################################################
// MARK: 関数

/**
 * 保存済みの設定を取得する。
 */
export async function getSettings(): Promise<Settings>
{
  const entries = await Promise.all(settingKeys.map(async (key): Promise<[string, unknown]> => [key, await settingItems[key].getValue()]));
  return toSettings(Object.fromEntries(entries));
}

/**
 * 設定の一部を変更して保存する。変更した項目だけを保存する。
 * @returns 変更後の設定。
 */
export async function updateSettings(patch: Partial<Settings>): Promise<Settings>
{
  await Promise.all(settingKeys.map((key) => setSetting(key, patch[key])));
  return getSettings();
}

/**
 * 設定の変更を監視する。
 * ほかの画面や端末で変更したときにも呼び出される。どの項目が変更されても、全項目がそろった設定で通知する。
 * @returns 監視を終了する関数。
 */
export function watchSettings(onChange: (settings: Settings) => void): () => void
{
  // 連続で変更されたときに、取得し直した結果の順番が入れ替わらないように、順番に取得する。
  const queue = new SerialQueue();
  const unwatches = settingKeys.map((key) => settingItems[key].watch(() =>
  {
    void queue.run(getSettings).then(onChange);
  }));
  return () =>
  {
    for(const unwatch of unwatches)
    {
      unwatch();
    }
  };
}

/**
 * 保存済みの値から、全項目がそろった設定を作成する。
 * 欠けている項目や、形式が不正な項目は、初期値にする。
 * 後から項目を追加したときや、古いバージョン・別の端末が別の形式で保存したときにも、問題なく取得できるようにするため。
 */
export function toSettings(stored: unknown): Settings
{
  const record = (
    (isRecord(stored))
    ? stored
    : {}
  );
  return {
    isLinkHighlighted: getValidValue(record.isLinkHighlighted, settingGuards.isLinkHighlighted, defaultSettings.isLinkHighlighted),
    highlightColor: getValidValue(record.highlightColor, settingGuards.highlightColor, defaultSettings.highlightColor),
  };
}

// #############################################################################
// MARK: 内部関数

/**
 * 設定の1項目を保存する。値がないとき（変更しない項目）は、何もしない。
 */
async function setSetting<TKey extends keyof Settings>(key: TKey, value: Settings[TKey] | undefined): Promise<void>
{
  if(value === undefined) return;
  await settingItems[key].setValue(value);
}

/**
 * 値が `#rrggbb` の形式の色かを判定する。
 */
function isHexColor(value: unknown): value is string
{
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}
