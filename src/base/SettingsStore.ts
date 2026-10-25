import { storage } from "wxt/utils/storage";
import type { WxtStorageItem } from "wxt/utils/storage";
import { z } from "zod/mini";
import { SerialQueue } from "@/util/SerialQueue";

// #############################################################################
// MARK: 型定義

/**
 * ユーザが設定画面で変更する値。形式は settingFieldsSchema で定義する。
 */
export type Settings = z.infer<typeof settingFieldsSchema>;

/**
 * 設定の項目ごとの保存先。
 */
type SettingItems = {
  [TKey in keyof Settings]: WxtStorageItem<Settings[TKey], Record<string, unknown>>;
};

// #############################################################################
// MARK: 定数

/**
 * 設定の項目ごとの形式と初期値。
 * catch の値は、項目が欠けているときや、形式が不正なときに使用する初期値。
 * 項目を追加するときは、ここと、下の settingKeys・SettingsStore の #items に追加する。
 */
const settingFieldsSchema = z.object({
  /** ページのリンクを、枠で囲んで表示するか。 */
  isLinkHighlighted: z.catch(z.boolean(), false),
  /** 枠の色。`#rrggbb` の形式で保持する。色の入力欄が返す形式に合わせるため。 */
  highlightColor: z.catch(z.string().check(z.regex(/^#[0-9a-f]{6}$/i)), "#e8590c"),
});

/**
 * 何も保存されていないときの設定（初期値）。
 */
export const defaultSettings: Settings = settingFieldsSchema.parse({});

/**
 * 保存済みの値を、全項目がそろった設定に変換するスキーマ。
 * 値がオブジェクトでないときは、すべての項目を初期値にする。
 */
const settingsSchema = z.catch(settingFieldsSchema, defaultSettings);

/**
 * 設定の項目名の一覧。
 */
const settingKeys: (keyof Settings)[] = ["isLinkHighlighted", "highlightColor"];

// #############################################################################
// MARK: クラス

/**
 * 設定の保存先。同じユーザの別の端末とも同期するように、sync に保存する。
 * インスタンスは、使用するエントリポイントが作成する。
 *
 * 項目ごとに別のキーで保存する。1つのオブジェクトで保存すると、変更のたびに「全体を取得し、1項目を変更し、全体を保存する」ことになる。
 * その場合、別のタブや端末でほぼ同時に別の項目を変更すると、後から保存したほうが先の変更を古い値で上書きしてしまうため。
 * 同じ項目を同時に変更したときは、後から変更したほうが残る。
 *
 * 項目の形式を変更するときは、その項目に version と migrations を指定する。例えば、色を `#rrggbb` から色名に変更する場合:
 * `storage.defineItem<string>("sync:highlightColor", { fallback: "orange", version: 2, migrations: { 2: toColorName } })`
 */
export class SettingsStore
{
  readonly #items: SettingItems = {
    isLinkHighlighted: storage.defineItem<boolean>("sync:isLinkHighlighted", { fallback: defaultSettings.isLinkHighlighted }),
    highlightColor: storage.defineItem<string>("sync:highlightColor", { fallback: defaultSettings.highlightColor }),
  };

  // ===========================================================================
  // MARK: 取得・保存

  /**
   * 保存済みの設定を取得する。
   */
  public get = async (): Promise<Settings> =>
  {
    const entries = await Promise.all(settingKeys.map(async (key): Promise<[string, unknown]> => [key, await this.#items[key].getValue()]));
    return this.parse(Object.fromEntries(entries));
  };

  /**
   * 設定の一部を変更して保存する。変更した項目だけを保存する。
   * @returns 変更後の設定。
   */
  public update = async (patch: Partial<Settings>): Promise<Settings> =>
  {
    await Promise.all(settingKeys.map((key) => this.#set(key, patch[key])));
    return this.get();
  };

  /**
   * 設定の変更を監視する。
   * ほかの画面や端末で変更したときにも呼び出される。どの項目が変更されても、全項目がそろった設定で通知する。
   * @returns 監視を終了する関数。
   */
  public watch = (onChange: (settings: Settings) => void): () => void =>
  {
    // 連続で変更されたときに、取得し直した結果の順番が入れ替わらないように、順番に取得する。
    const queue = new SerialQueue();

    const unwatches = settingKeys.map((key) => this.#items[key].watch(() =>
    {
      void queue.run(this.get).then(onChange);
    }));

    return () =>
    {
      for(const unwatch of unwatches)
      {
        unwatch();
      }
    };
  };

  /**
   * 保存済みの値から、全項目がそろった設定を作成する。
   * 欠けている項目や、形式が不正な項目は、初期値にする。
   * 後から項目を追加したときや、古いバージョン・別の端末が別の形式で保存したときにも、問題なく取得できるようにするため。
   */
  public parse = (stored: unknown): Settings =>
  {
    return settingsSchema.parse(stored);
  };

  // ===========================================================================
  // MARK: 内部関数

  /**
   * 設定の1項目を保存する。値がないとき（変更しない項目）は、何もしない。
   */
  #set = async <TKey extends keyof Settings>(key: TKey, value: Settings[TKey] | undefined): Promise<void> =>
  {
    if(value === undefined) return;
    await this.#items[key].setValue(value);
  };
}
