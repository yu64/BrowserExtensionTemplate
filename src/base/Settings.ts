import { storage } from "wxt/utils/storage";
import type { WxtStorageItem } from "wxt/utils/storage";
import { guardedValueOf, isBoolean, isRecord } from "@/util/guards";
import type { Guard } from "@/util/guards";
import { SerialQueue } from "@/util/SerialQueue";

// #############################################################################
// MARK: 型定義

/**
 * 利用者が設定画面で変える値。
 * 項目を足すときは、ここと、下の defaultSettings・settingItems・settingGuards に足す。
 */
export type Settings = {
  /** ページのリンクを、枠で囲んだ状態にするか。 */
  linksHighlighted: boolean;
  /** 枠の色。`#rrggbb` の形で持つ。色の入力欄が返す形に合わせるため。 */
  highlightColor: string;
};

/**
 * 設定の項目ごとに、保存先を並べたもの。
 */
type SettingItems = {
  [TKey in keyof Settings]: WxtStorageItem<Settings[TKey], Record<string, unknown>>;
};

// #############################################################################
// MARK: 定数

/**
 * まだ何も保存していないときの設定。
 */
export const defaultSettings: Settings = {
  linksHighlighted: false,
  highlightColor: "#e8590c",
};

/**
 * 設定の項目ごとに、保存した値の形を確かめる関数。
 */
const settingGuards: { [TKey in keyof Settings]: Guard<Settings[TKey]> } = {
  linksHighlighted: isBoolean,
  highlightColor: isHexColor,
};

// #############################################################################
// MARK: 状態

/**
 * 設定の保存先。同じ人の別の端末でもそろうように、sync に置く。
 *
 * 項目ごとに別のキーで保存する。1つのまとまりで保存すると、変えるたびに「全体を読んで、1項目を変えて、全体を書く」ことになる。
 * そうすると、別のタブや端末でほぼ同時に違う項目を変えたとき、後から書いたほうが先の変更を古い値で上書きしてしまうため。
 * 同じ項目を同時に変えたときは、後から変えたほうが残る。
 *
 * 読んだ値は、settingsOf で形を確かめてから使う。
 * 項目の形を変えるときは、その項目に version と migrations を書く。例えば、色を `#rrggbb` から名前に変えるなら:
 * `storage.defineItem<string>("sync:highlightColor", { fallback: "orange", version: 2, migrations: { 2: colorNameOf } })`
 */
const settingItems: SettingItems = {
  linksHighlighted: storage.defineItem<boolean>("sync:linksHighlighted", { fallback: defaultSettings.linksHighlighted }),
  highlightColor: storage.defineItem<string>("sync:highlightColor", { fallback: defaultSettings.highlightColor }),
};

/**
 * 設定の項目の名前の一覧。
 */
const settingKeys: (keyof Settings)[] = ["linksHighlighted", "highlightColor"];

// #############################################################################
// MARK: 関数

/**
 * 保存した設定を読む。
 */
export async function loadSettings(): Promise<Settings>
{
  const entries = await Promise.all(settingKeys.map(async (key): Promise<[string, unknown]> => [key, await settingItems[key].getValue()]));
  return settingsOf(Object.fromEntries(entries));
}

/**
 * 設定の一部を変えて保存する。変えた項目だけを書く。
 * @returns 変えた後の設定。
 */
export async function updateSettings(patch: Partial<Settings>): Promise<Settings>
{
  await Promise.all(settingKeys.map((key) => writeSetting(key, patch[key])));
  return loadSettings();
}

/**
 * 設定が変わるのを見張る。
 * ほかの画面や端末で変えたときにも呼ばれる。どの項目が変わっても、欠けのない設定で知らせる。
 * @returns 見張るのをやめる関数。
 */
export function watchSettings(onChange: (settings: Settings) => void): () => void
{
  // 続けて変わったときに、読み直した結果が前後しないように、順番に読む。
  const queue = new SerialQueue();
  const unwatches = settingKeys.map((key) => settingItems[key].watch(() =>
  {
    void queue.run(loadSettings).then(onChange);
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
 * 保存した値から、欠けのない設定を作る。
 * 欠けた項目や形の違う項目は、既定値にする。
 * 後から項目を足したときや、古い版・別の端末が違う形で書いたときにも、壊れずに読めるようにするため。
 */
export function settingsOf(stored: unknown): Settings
{
  const record = (
    (isRecord(stored))
    ? stored
    : {}
  );
  return {
    linksHighlighted: guardedValueOf(record.linksHighlighted, settingGuards.linksHighlighted, defaultSettings.linksHighlighted),
    highlightColor: guardedValueOf(record.highlightColor, settingGuards.highlightColor, defaultSettings.highlightColor),
  };
}

// #############################################################################
// MARK: 内部関数

/**
 * 設定の1項目を書く。値がないとき（変えない項目）は、何もしない。
 */
async function writeSetting<TKey extends keyof Settings>(key: TKey, value: Settings[TKey] | undefined): Promise<void>
{
  if(value === undefined) return;
  await settingItems[key].setValue(value);
}

/**
 * 値が `#rrggbb` の形の色かを調べる。
 */
function isHexColor(value: unknown): value is string
{
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}
