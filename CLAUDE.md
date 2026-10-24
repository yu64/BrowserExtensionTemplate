# CLAUDE.md

WXT で作るブラウザー拡張のひな形。拡張のページ（ポップアップ・設定画面）は React 19 と Tailwind CSS 4、背景と内容スクリプトは素の TypeScript で書く。

## コードの書き方

@docs/coding-style.md

## よく使うコマンド

- `npm run dev` … 開発用の Chrome を開き、変更をすぐ反映する。
- `npm run build` … `.output/chrome-mv3` に本番用を作る。
- `npm run check` … lint・型検査・単体試験をまとめて流す。終わったと報告する前に必ず通す。
- `npm run lint:firefox` … Firefox 向けに作り、`web-ext lint` を流す。manifest や権限を変えたら流す。
- `npm run e2e` … 本番用を作り、Playwright とインストールしてある Chrome で E2E 試験を流す。画面や入り口を変えたら流す。
- `npm run format` … ESLint で整形する。
- CI（`.github/workflows/ci.yml`）は初めは止めてある。リポジトリの変数 `CI_ENABLED` が `true` のときか、手で流したときだけ動く。

## 置き場所

- `src/wxt/` … 拡張の入り口（背景・ポップアップ・設定画面・内容スクリプト）。WXT がここからマニフェストを作る（`wxt.config.ts` の `entrypointsDir`）。
- `src/base/` … この拡張だけのもので、複数の入り口が使う部品（保存する値・メッセージの一覧など）。`src/wxt/` を読み込まない（入り口が部品を使う向きだけにする）。
- `src/util/` … どの拡張でも使える部品（関数・仕組み）。`src/base/` を読み込まない（この拡張のことを知らないままにする）。
- 1つの入り口だけが使う部品は、その入り口のフォルダーの中に置く。
- `src/style/app.css` … 拡張のページの見た目のもと。Tailwind の読み込み、色（`@theme`）、暗い表示の色、全体の土台だけを置く。各画面の `main.tsx` が読み込む。
- `test/` … 試験のための道具。`setup.ts` は単体試験の下準備。
- `test/e2e/` … Playwright で拡張を動かす試験。拡張を読み込んだ Chrome は `fixtures.ts` の `test` が用意する。試験はこの `test` を使い、`extensionContext`・`extensionId` を受け取る。
- 単体試験は、試す部品の隣に `*.test.ts` か `*.spec.ts` で置く。画面に依存しない計算は、部品に分けて単体試験で確かめる。
- `public/` … そのまま出力に写すもの（アイコン・`_locales` の文言）。

## 決まりごと

- 自動の読み込み（auto-import）は切ってある。`wxt/browser` や `wxt/utils/...` から明示して読み込む。
- メッセージの種類は `src/base/protocol.ts` に足す。型と確かめる関数を両方足す。
- 画面の文言は `public/_locales/*/messages.json` に書き、コードでは `messageOf` で引く。HTML と manifest では `__MSG_名前__` の形で書く。文言を足したら `npx wxt prepare` で型を作り直す。
- 画面の `lang` と題名は、各画面の `main.tsx` が `messageOf("htmlLang")` などで入れる。
- 保存する値は `wxt/utils/storage` の `storage.defineItem` で定義する。形を変えるときは `version` と `migrations` を使う。
- 保存した値は、読んだときに形を確かめる（`settingsOf`・`counterOf` を見本にする）。保存する部品の外には、確かめる前の値（storage の item）を出さない。いくつかの値は、1つのまとまりにせず項目ごとに保存する（`Settings.ts`）。別のタブや端末と同時に書いても、変更が消えないようにするため。「読んでから書く」保存は `SerialQueue` で順番待ちさせ、書くのは1か所にまとめる（`Counter.ts` は背景だけが書く）。
- 画面（ポップアップ・設定画面）は、保存した値を読み終えるまで何も描かない（`useStoredValue` が `undefined` の間は `undefined` を返す）。描いたときには操作を受け付けられる。E2E 試験は、見出しが出たことを「準備ができた」しるしとして待つ。
- 保存した値は `useStoredValue(読み込む関数, 見張る関数)` で読む。渡す関数は、ファイルの外で定義したもの（描くたびに作り直さないもの）にする。
- React に依存しないもの（背景・内容スクリプト・`src/base`・`src/util` の多く）では React を読み込まない。
- 画面の操作で失敗したら、画面にも知らせる（`console.error` だけにしない）。
- 見張り（`watch`）は、最初の値を読む前に始める。読む間の変化を取りこぼさないため。
- 見た目は、部品の JSX に Tailwind のクラスで書く。画面ごとの CSS ファイルは作らない。色は `text-ink`・`bg-paper`・`text-accent`・`text-danger` などの、この拡張の色を使う（Tailwind の既定の色は直に使わない）。暗い表示は色の変数で差し替わるので、`dark:` は書かなくてよい。
- 両方の画面で同じ見た目の部品（ボタンなど）は、`src/base/` に React の部品として置く。
- 内容スクリプトでは Tailwind（`app.css`）を読み込まない。土台の CSS が、ほかのサイトのページの見た目を崩すため。
