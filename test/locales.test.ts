import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isRecord } from "@/util/guards";

/**
 * 文言のファイルが並ぶフォルダー。
 */
const localesDir = join(import.meta.dirname, "../public/_locales");

/**
 * 文言の名前を書いてあるファイル。入り口の HTML と、WXT の設定（manifest の __MSG_ の形）。
 */
const sourceFiles = [
  ...readdirSync(join(import.meta.dirname, "../src/wxt"), {
    recursive: true,
    encoding: "utf8",
  })
    .filter((path) => path.endsWith(".html"))
    .map((path) => join(import.meta.dirname, "../src/wxt", path)),
  join(import.meta.dirname, "../wxt.config.ts"),
];

/**
 * 文言の名前を拾う書き方。`data-i18n="名前"`・`data-i18n-lang="名前"`・`__MSG_名前__`。
 */
const messageNamePatterns = [
  /data-i18n(?:-lang)?="([^"]+)"/g,
  /__MSG_(\w+)__/g,
];

/**
 * 言語ごとの文言のファイルを読む。
 * @returns 文言の名前ごとに、差し込む値（placeholders）の名前を並べたもの。
 */
function placeholdersOf(locale: string): Record<string, string[]>
{
  const json: unknown = JSON.parse(readFileSync(join(localesDir, locale, "messages.json"), "utf8"));
  if(!isRecord(json))
  {
    throw new Error(`文言のファイルの形が違います: ${locale}`);
  }
  return Object.fromEntries(Object.entries(json).map(([key, entry]) =>
  {
    const placeholders = (
      (isRecord(entry) && isRecord(entry.placeholders))
      ? Object.keys(entry.placeholders).sort()
      : []
    );
    return [key, placeholders];
  }));
}

describe("文言のファイル", () =>
{
  // フォルダーだけを言語とみなす。OS が作る隠しファイル（.DS_Store など）を拾わないため。
  const locales = readdirSync(localesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const base = placeholdersOf("ja");

  it.each(locales)("%s は、日本語と同じ名前と差し込む値を持つ", (locale) =>
  {
    expect(placeholdersOf(locale)).toEqual(base);
  });
});

describe("使っている文言の名前", () =>
{
  const known = Object.keys(placeholdersOf("ja"));
  const used = [...new Set(sourceFiles.flatMap((path) =>
  {
    const text = readFileSync(path, "utf8");
    return messageNamePatterns.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => match[1] ?? ""));
  }))];

  it("1つ以上見つかる", () =>
  {
    // 拾う書き方が壊れて、何も確かめずに通るのを防ぐ。
    expect(used.length).toBeGreaterThan(0);
  });

  // HTML の書き間違いは、画面を開くまで分からないので、ここで先に見つける。
  it.each(used)("%s が文言のファイルにある", (name) =>
  {
    expect(known).toContain(name);
  });
});

describe("既定の言語", () =>
{
  it("manifest の default_locale の文言のファイルがある", () =>
  {
    const config = readFileSync(join(import.meta.dirname, "../wxt.config.ts"), "utf8");
    const locale = /default_locale:\s*"([^"]+)"/.exec(config)?.[1] ?? "";
    expect(() => placeholdersOf(locale)).not.toThrow();
  });
});
