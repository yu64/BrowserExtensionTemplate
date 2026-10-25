# CLAUDE.md

WXT を使用したブラウザ拡張機能のテンプレート。拡張機能のページ（ポップアップ・設定画面）は React 19 と Tailwind CSS 4、バックグラウンドとコンテンツスクリプトは TypeScript だけで作成する。
詳細は `docs/guide.md` を参照。

## コーディングルール

@docs/coding-style.md

## 進め方

- 返答は日本語で、やさしい言葉で書く。
- 作る前に「決めること」を一覧にし、選択肢とおすすめを添えて相談する。了承をもらってから作る。
- 仕様の穴を自分で埋めて進めない。決めていないことに気づいたら、止めて聞く。
- ライブラリを入れる前に相談する。
- 作業中に自分で決めた細部は、報告のときに「違えば直します」と書いて知らせる。
- 整形の後に、lint・型検査・単体テストを通してから、終わったと報告する。

## 用語

コメント・ドキュメント・画面のメッセージでは、次の用語に統一する。

- テスト（単体テスト・E2E テスト）、テンプレート、拡張機能、エントリポイント、バックグラウンド、コンテンツスクリプト、メッセージ（画面の文字列）
- ブラウザ、フォルダ、ユーザ、サーバ（末尾の「ー」を付けない）。リスナー・ハンドラー・カウンターなどは「ー」を付ける。
- 動詞は漢語を基本にする（取得・保存・設定・指定・追加・削除・変更・表示・実行・確認・検証・監視・作成・通知など）。

## よく使用するコマンド

- `npm run dev` … 開発用の Chrome を起動し、変更をすぐに反映する。
- `npm run build` … `.output/chrome-mv3` にビルドする。
- `npm run check` … lint・型検査・単体テストをまとめて実行する。完了を報告する前に、必ず成功させる。
- `npm run lint:firefox` … Firefox 向けにビルドし、`web-ext lint` を実行する。manifest や権限を変更したら実行する。
- `npm run e2e` … ビルドし、Playwright とインストール済みの Chrome で E2E テストを実行する。画面やエントリポイントを変更したら実行する。
- `npm run format` … ESLint で整形する。
- CI（`.github/workflows/ci.yml`）は初期状態では無効。リポジトリの変数 `CI_ENABLED` が `true` のときか、手動で実行したときだけ動作する。

## 配置

- `src/wxt/` … エントリポイント（バックグラウンド・ポップアップ・設定画面・コンテンツスクリプト）。WXT がここから manifest を生成する（`wxt.config.ts` の `entrypointsDir`）。
- `src/base/` … この拡張機能専用で、複数のエントリポイントが使用するモジュール（保存する値・メッセージの一覧など）。`src/wxt/` に依存しない（依存の向きを一方向にする）。
- `src/util/` … どの拡張機能でも使用できる汎用のモジュール。`src/base/` に依存しない（この拡張機能に依存させない）。
- 1つのエントリポイントだけが使用するモジュールは、そのエントリポイントのフォルダに置く。
- `src/style/app.css` … 拡張機能のページのスタイルの基本。Tailwind の読み込み、色（`@theme`）、ダークモードの色、基本のスタイルだけを置く。各画面の `main.tsx` が読み込む。
- `test/` … テスト用のファイル。`setup.ts` は単体テストの準備。
- `test/e2e/` … Playwright で拡張機能を動作させるテスト。拡張機能を読み込んだ Chrome は `fixtures.ts` の `test` が準備する。テストはこの `test` を使用し、`extensionContext`・`extensionId` を受け取る。
- 単体テストは、テストするモジュールの隣に `*.test.ts` か `*.spec.ts` で置く。画面に依存しない処理は、モジュールに分けて単体テストで確認する。
- `public/` … そのまま出力にコピーするファイル（アイコン・`_locales` のメッセージ）。

## ルール

- 自動インポート（auto-import）は無効にしている。`wxt/browser` や `wxt/utils/...` から明示的に import する。
- メッセージの送受信は `@webext-core/messaging` を使用する。種別は `src/base/protocol.ts` の `ProtocolMap` に追加し、`sendMessage`・`onMessage` で送受信する。
- 画面のメッセージは `public/_locales/*/messages.json` に記述し、コードでは `getMessage` で取得する。HTML と manifest では `__MSG_名前__` の形式で記述する。メッセージを追加したら `npx wxt prepare` で型を再生成する。
- 画面の `lang` とタイトルは、各画面の `main.tsx` が `getMessage("htmlLang")` などで設定する。
- 保存する値は `wxt/utils/storage` の `storage.defineItem` で定義する。形式を変更するときは `version` と `migrations` を使用する。
- 保存済みの値は、取得したときに Zod（`zod/mini`）のスキーマで形式を検証する（`toSettings`・`toCount` を参考にする）。コンテンツスクリプトの出力を小さくするため、`zod` ではなく `zod/mini` を import する。保存するモジュールの外には、検証前の値（storage の item）を公開しない。複数の値は、1つのオブジェクトにせず項目ごとに保存する（`Settings.ts`）。別のタブや端末と同時に保存しても、変更が失われないようにするため。「取得してから保存する」処理は `SerialQueue` で順番に実行し、保存する場所は1か所にまとめる（`Counter.ts` はバックグラウンドだけが保存する）。
- 画面（ポップアップ・設定画面）は、保存済みの値を取得するまで何も描画しない（`useStoredValue` が `undefined` の間は `undefined` を返す）。描画した時点で操作できる状態にする。E2E テストは、見出しの表示を「準備完了」の目印として待つ。
- 保存済みの値は `useStoredValue(取得する関数, 監視する関数)` で取得する。渡す関数は、ファイルの外で定義したもの（描画のたびに作り直さないもの）にする。
- React に依存しないもの（バックグラウンド・コンテンツスクリプト・`src/base`・`src/util` の多く）では React を import しない。
- 画面の操作で失敗したら、画面にも表示する（`console.error` だけにしない）。
- 監視（`watch`）は、最初の値を取得する前に開始する。取得中の変更を取りこぼさないため。
- スタイル（Tailwind）と JSX の形式のルールは、`docs/coding-style.md` の「JSX の形」「見た目（Tailwind CSS）」にある。
