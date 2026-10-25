# ガイド

このテンプレートの構成と使い方の詳細。

## 概要

- [WXT](https://wxt.dev/) で、Chrome・Edge（MV3）と Firefox（MV2）向けに、同じソースからビルドする。
- 対応バージョンは Chrome 99 以上、Firefox 140 以上（Android 版は 142 以上）。
- 拡張機能のページ（ポップアップ・設定画面）は React 19 と Tailwind CSS 4 で、バックグラウンドとコンテンツスクリプトは TypeScript だけで作成している。
  React は、React を import するページの出力にだけ含まれる。
- メッセージは日本語と英語に対応する。どちらでもない言語のユーザには、英語で表示する。

| 種類 | 内容 |
| --- | --- |
| フレームワーク | WXT 0.21 ／ Vite 8 ／ TypeScript 6 ／ React 19（`@wxt-dev/module-react`） |
| スタイル | Tailwind CSS 4（`@tailwindcss/vite`）。色は `src/style/app.css` の `@theme` で定義し、ダークモードでは自動で置き換える |
| 静的検査 | ESLint 10（typescript-eslint の strict ＋ React のフックのルール ＋ コーディングルール）／ `tsc --noEmit` |
| 単体テスト | Vitest 5 ＋ WXT のモック（`fakeBrowser`） |
| E2E テスト | Playwright で、インストール済みの Chrome に拡張機能を読み込んで実行する |
| 開発 | `web-ext` で開発用のブラウザを起動し、変更をすぐに反映する |
| CI | GitHub Actions で、lint・型検査・単体テスト・Firefox 向けの検査・E2E テスト・zip の作成を実行する（初期状態では無効） |
| メッセージの送受信 | [@webext-core/messaging](https://webext-core.aklinker1.io/messaging/installation)（WXT の作者によるライブラリ） |
| 値の検証 | [Zod](https://zod.dev/)（`zod/mini`。コンテンツスクリプトの出力を小さくするため） |
| 依存関係の更新 | Dependabot が、月に1回まとめてプルリクエストを作成する |

## サンプル

| エントリポイント | ファイル | 処理 |
| --- | --- | --- |
| バックグラウンド | `src/wxt/background.ts` | カウンターを増やすリクエストを受けて保存する。カウンターの値をツールバーのバッジに表示する。 |
| ポップアップ（React） | `src/wxt/popup/` | カウンターの値を表示し、増やす。現在のタブのリンクをコンテンツスクリプトに数えさせる。設定画面を開く。 |
| 設定画面（React） | `src/wxt/options/` | 「リンクを枠で囲む」と枠の色を変更する。変更したらすぐに保存する。 |
| コンテンツスクリプト | `src/wxt/links.content/` | リンクを数えるリクエストに応答する。設定に合わせて、リンクを枠で囲む。 |

## フォルダ構成

| フォルダ | 内容 |
| --- | --- |
| `src/wxt/` | エントリポイント。WXT が manifest を生成する元になる（`wxt.config.ts` の `entrypointsDir`）。1つのエントリポイントだけが使用するモジュールも、そのフォルダに置く。 |
| `src/base/` | この拡張機能専用で、複数のエントリポイントが使用するモジュール。自分の拡張機能にするときは、ここを書き換える。 |
| `src/util/` | どの拡張機能でも使用できる汎用のモジュール。`src/base/` に依存しないので、そのまま使用できる。 |
| `src/style/` | 拡張機能のページのスタイルの基本（`app.css`）。 |
| `public/` | そのまま出力にコピーするファイル（アイコン・`_locales` のメッセージ）。 |
| `test/` | テスト用のファイル。`setup.ts` は単体テストの準備、`e2e/` は E2E テスト。 |

`src/base/` のモジュール。

| ファイル | 内容 |
| --- | --- |
| `protocol.ts` | この拡張機能で送受信するメッセージの一覧（`ProtocolMap`）と、送受信する関数（`sendMessage`・`onMessage`）。`import * as protocol` で読み込む。 |
| `Button.tsx` | この拡張機能のボタン。`variant` で種類（`primary`・`link`）を指定する。 |
| `CounterStore.ts` | カウンター（`local` に保存）の保存先のクラスと、バッジに表示する文字列の作成。 |
| `SettingsStore.ts` | 設定（`sync` に、項目ごとに別のキーで保存）の保存先のクラス。別のタブや端末で同時に別の項目を変更しても、変更が失われない。取得した値は Zod のスキーマで検証し、欠けている項目や不正な項目は初期値で補う。 |

`src/util/` のモジュール。

| ファイル | 内容 |
| --- | --- |
| `SerialQueue.ts` | 非同期の処理を1つずつ順番に実行する。「取得してから保存する」処理が重なって、変更が失われるのを防ぐ。 |
| `i18n.ts` | メッセージを取得する `getMessage`。`import * as i18n` で読み込む。メッセージの名前の型は、WXT がメッセージファイルから生成する。 |
| `useStoredValue.ts` | 保存済みの値を取得し、変更されたら再描画する React のフック。`useStoredValue(store.get, store.watch)` のように使用する。 |

## 環境

Node.js は 22.13 以上の 22・24、または 26 以上が必要（ESLint・Vite・Vitest の要件に合わせている。25 は使用できない）。
[proto](https://moonrepo.dev/proto) を使用している場合、`proto use` で `.prototools` に指定したバージョン（Node.js 24）が準備される。

## 開発

`npm run dev` で開発用の Chrome が起動し、`https://example.com/` を表示する。
ソースを保存すると、拡張機能が自動で再読み込みされる。
開発用の Chrome のプロファイルは `.wxt/chrome-data` に保持されるので、ログインや設定は次の起動時も残る。
ただし `.wxt` ごと削除する操作（`npx wxt clean` や手動での削除）をすると、プロファイルも削除される。
Firefox で試すときは `npm run dev:firefox` を使用する。

手動で読み込むときは、`npm run build` でビルドし、Chrome の `chrome://extensions` で「デベロッパー モード」を有効にして、「パッケージ化されていない拡張機能を読み込む」から `.output/chrome-mv3` を選択する。

## コマンド

| コマンド | 処理 |
| --- | --- |
| `npm run dev` / `dev:firefox` | 開発用のブラウザを起動し、変更をすぐに反映する |
| `npm run build` / `build:firefox` | `.output/` にビルドする |
| `npm run zip` / `zip:firefox` | ストアに提出する zip を作成する |
| `npm run format` | ESLint で整形する |
| `npm run lint` | ESLint で検査する |
| `npm run lint:firefox` | Firefox 向けにビルドし、Firefox の審査で使用される検査（`web-ext lint`）を実行する |
| `npm run typecheck` | 型検査を実行する |
| `npm run test` / `test:watch` | 単体テストを実行する |
| `npm run e2e` | ビルドし、Playwright と Chrome で E2E テストを実行する |
| `npm run e2e:report` | 最後に実行した E2E テストのレポートを、ブラウザで開く |
| `npm run check` | lint・型検査・単体テストをまとめて実行する |

## テスト

- 単体テストは、テストするモジュールの隣に `*.test.ts` か `*.spec.ts` で置く。拡張機能全体のファイルを確認するテスト（メッセージファイルなど）は、`test/` の直下に置く。
- E2E テストは `test/e2e/` に置く。[Playwright](https://playwright.dev/) で Chrome を起動して拡張機能を読み込み、ポップアップ・バックグラウンド・設定画面・コンテンツスクリプトを実際に動作させて確認する。

E2E テストの補足。

- **使用するブラウザ：** インストール済みの Google Chrome を使用する。Playwright が配布する Chromium は使用しないので、`npx playwright install` は不要。Playwright の Chromium は署名がなく、Windows の「スマート アプリ コントロール」が有効だと起動できないため。
- **拡張機能の読み込み：** 正式版の Chrome は、起動時の `--load-extension` を受け付けない。そのため、起動後に DevTools プロトコルの `Extensions.loadUnpacked` で読み込む（`test/e2e/fixtures.ts`）。
- **テストの独立性：** Chrome はテストの実行中、1つを使い回す（終了に時間がかかるため）。テストごとに保存済みの値を削除し、開いたタブを閉じるので、テストどうしは影響しない。
- **失敗したとき：** `temp/` にスクリーンショットとトレースが保存される。`npm run e2e:report` でレポートを開ける。

## CI（GitHub Actions）

`.github/workflows/ci.yml` で、lint・型検査・単体テスト・Firefox 向けの検査・E2E テスト・zip の作成を実行する。20 分を超えたら中止する。
非公開のリポジトリでは Actions の利用時間に上限があるので、初期状態では無効にしている。push しても、ジョブはスキップされる。

- **手動で実行：** GitHub の Actions の画面で CI を選択し、「Run workflow」を押す。
- **自動で実行：** リポジトリの Settings → Secrets and variables → Actions → Variables で、`CI_ENABLED` に `true` を設定する。`main` への push とプルリクエストのたびに実行される。無効にするときは、変数を削除するか `true` 以外にする。

依存関係の更新は、`.github/dependabot.yml` で Dependabot が月に1回、npm と GitHub Actions のそれぞれ1つのプルリクエストにまとめて通知する。Dependabot 自体は Actions の利用時間を消費しない。不要なときは、このファイルを削除する。

## 自分の拡張機能にするとき

1. `package.json` の `name` と `description`、`public/_locales/*/messages.json` の `extName` と `extDescription` を変更する。
   Firefox に提出するときは、`wxt.config.ts` の `gecko.id` も自分の ID に変更する。
   `LICENSE` の著作者と年も変更する。
2. `public/icon/` のアイコンを置き換える（16・32・48・96・128 の PNG）。
3. コンテンツスクリプトの `matches` を、必要なページだけに限定する。`<all_urls>` のままだと、ストアの審査で理由を求められやすい。
4. 不要なサンプルのエントリポイントを削除する。`src/wxt/` からフォルダを削除すれば、manifest からも削除される。

## 追加するとき

- **エントリポイント** … `src/wxt/` にファイルを置く。命名規則は [WXT のドキュメント](https://wxt.dev/guide/essentials/entrypoints.html) を参照。
- **権限** … `wxt.config.ts` の `manifest.permissions` に追加する。
- **新しいブラウザの機能** … その機能に対応したバージョンに合わせて、`wxt.config.ts` の `minimum_chrome_version`・`strict_min_version` を上げる。
- **メッセージの種別** … `src/base/protocol.ts` の `ProtocolMap` に「種別: (リクエスト) => レスポンス」の形で追加する。受信側で `protocol.onMessage(種別, ハンドラー)`、送信側で `protocol.sendMessage(種別, リクエスト)` を呼び出す（コンテンツスクリプトへ送信するときは、第3引数にタブ ID を指定する）。
- **保存する値** … `storage.defineItem` で定義する。形式を変更するときは `version` を上げ、`migrations` に変換処理を書く。
  複数の値をまとめて保持するときは、1つのオブジェクトにせず、`SettingsStore.ts` のように項目ごとに分けて保存する。保存先はクラスにし、インスタンスは使用するエントリポイントで作成する（React の画面には props で渡す）。
  「取得してから保存する」処理（カウンターを増やすなど）は、`SerialQueue` で順番に実行する。キューが機能するのは同じページの中だけなので、保存する場所は1か所（バックグラウンドなど）にまとめる。
- **画面のメッセージ** … `public/_locales/ja/messages.json` と `en/messages.json` の両方に追加する。`npm run dev` か `npx wxt prepare` を実行すると、`i18n.getMessage` で型が有効になる。
  言語のファイルどうしで名前がそろっているかと、HTML や manifest で使用する名前がファイルにあるかは、単体テスト（`test/locales.test.ts`）が確認する。
