import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod/mini";

/**
 * メッセージファイルのフォルダ。
 */
const localesDir = join(import.meta.dirname, "../public/_locales");

/**
 * メッセージの名前を記述しているファイル。src の中のコードと HTML、WXT の設定（manifest の __MSG_ の形式）。
 */
const sourceFiles = [
  ...readdirSync(join(import.meta.dirname, "../src"), {
    recursive: true,
    encoding: "utf8",
  })
    .filter((path) => /\.(html|ts|tsx)$/.test(path))
    .map((path) => join(import.meta.dirname, "../src", path)),
  join(import.meta.dirname, "../wxt.config.ts"),
];

/**
 * メッセージの名前を抽出するパターン。`__MSG_名前__`（HTML・manifest）と `getMessage("名前"`（コード）。
 * コードの名前は型でも検査しているが、HTML と manifest の名前は型で検査できないので、ここで確認する。
 */
const messageNamePatterns = [
  /__MSG_(\w+)__/g,
  /getMessage\("(\w+)"/g,
];

/**
 * メッセージファイルの形式。プレースホルダー以外の項目（message・description）は確認しない。
 */
const messagesSchema = z.record(z.string(), z.looseObject({ placeholders: z.optional(z.record(z.string(), z.unknown())) }));

/**
 * 言語ごとのメッセージファイルを読み込む。
 * @returns メッセージの名前ごとの、プレースホルダー（placeholders）の名前の一覧。
 */
function getPlaceholders(locale: string): Record<string, string[]>
{
  // 形式が不正なときは、zod がどこが不正かを示すエラーを投げる。
  const messages = messagesSchema.parse(JSON.parse(readFileSync(join(localesDir, locale, "messages.json"), "utf8")));
  return Object.fromEntries(Object.entries(messages).map(([key, entry]) => [key, Object.keys(entry.placeholders ?? {}).sort()]));
}

describe("メッセージファイル", () =>
{
  // フォルダだけを言語として扱う。OS が作成する隠しファイル（.DS_Store など）を除外するため。
  const locales = readdirSync(localesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const base = getPlaceholders("ja");

  it.each(locales)("%s は、日本語と同じ名前とプレースホルダーを持つ", (locale) =>
  {
    expect(getPlaceholders(locale)).toEqual(base);
  });
});

describe("使用しているメッセージの名前", () =>
{
  const known = Object.keys(getPlaceholders("ja"));

  const used = [...new Set(sourceFiles.flatMap((path) =>
  {
    const text = readFileSync(path, "utf8");
    return messageNamePatterns.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => match[1] ?? ""));
  }))];

  it("1つ以上見つかる", () =>
  {
    // 抽出するパターンが壊れて、何も確認せずに成功するのを防ぐ。
    expect(used.length).toBeGreaterThan(0);
  });

  // HTML や manifest の記述ミスは、拡張機能を開くまで分からないので、ここで事前に検出する。
  it.each(used)("%s がメッセージファイルにある", (name) =>
  {
    expect(known).toContain(name);
  });
});

describe("既定の言語", () =>
{
  it("manifest の default_locale のメッセージファイルがある", () =>
  {
    const config = readFileSync(join(import.meta.dirname, "../wxt.config.ts"), "utf8");
    const locale = /default_locale:\s*"([^"]+)"/.exec(config)?.[1] ?? "";
    expect(() => getPlaceholders(locale)).not.toThrow();
  });
});
