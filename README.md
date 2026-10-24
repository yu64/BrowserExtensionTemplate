# ブラウザー拡張のひな形（WXT）

[WXT](https://wxt.dev/) で作るブラウザー拡張のひな形です。
拡張のページ（ポップアップ・設定画面）は React 19 と Tailwind CSS 4 で、背景と内容スクリプトは素の TypeScript で書いています。
React は、それを読み込む画面の出力にだけ入ります。背景と内容スクリプトの出力には入りません。
Chrome・Edge（MV3）と Firefox（MV2）に、同じソースから出力できます。
対応するのは Chrome 99 以上、Firefox 140 以上（Android 版は 142 以上）です。
文言は日本語と英語があり、そのどちらでもない言語の人には英語で出します。

## 入っているもの

| 種類 | 中身 |
| --- | --- |
| 枠組み | WXT 0.21 ／ Vite 8 ／ TypeScript 6 ／ React 19（`@wxt-dev/module-react`） |
| 見た目 | Tailwind CSS 4（`@tailwindcss/vite`）。色は `src/style/app.css` の `@theme` にまとめ、ブラウザーが暗い表示のときは自動で差し替える |
| 検査 | ESLint 10（typescript-eslint の strict ＋ React のフックの規則 ＋ 決まりに合わせた規則）／ `tsc --noEmit` |
| 単体試験 | Vitest 5 ＋ WXT の偽ブラウザー（`fakeBrowser`） |
| E2E 試験 | Playwright で、インストールしてある Chrome に拡張を読み込んで動かす |
| 開発 | `web-ext` で開発用のブラウザーを自動で開き、変更をすぐ反映 |
| CI | GitHub Actions で、検査・単体試験・Firefox 向けの検査・E2E 試験・zip 作りを流す（初めは止めてある） |
| 依存の更新 | Dependabot が、月に1回まとめてプルリクエストを作る |

## サンプルの動き

| 入り口 | ファイル | すること |
| --- | --- | --- |
| 背景 | `src/wxt/background.ts` | 数を増やす要求を受けて保存する。数をツールバーのバッジに出す。 |
| ポップアップ（React） | `src/wxt/popup/` | 数を出して増やす。今のタブのリンクを内容スクリプトに数えさせる。設定画面を開く。 |
| 設定画面（React） | `src/wxt/options/` | 「リンクを枠で囲む」と枠の色を変える。変えたらすぐ保存する。 |
| 内容スクリプト | `src/wxt/links.content/` | リンクを数える要求に答える。設定に合わせて、リンクを枠で囲む。 |

入り口から使う部品は、2つのフォルダーに分けて置いています。

`src/base/` には、この拡張だけのもので、複数の入り口が使うものを置きます。自分の拡張にするときは、ここを書き換えます。

| ファイル | 役目 |
| --- | --- |
| `protocol.ts` | この拡張でやり取りするメッセージの一覧と、その窓口（`messenger`）。 |
| `Button.tsx` | この拡張のボタン。ポップアップと設定画面で見た目をそろえる。`variant` で種類（`primary`・`link`）を選ぶ。 |
| `Counter.ts` | 数（`local` に保存）と、バッジの文字の作り方。 |
| `Settings.ts` | 設定（`sync` に、項目ごとに別のキーで保存）。別のタブや端末で同時に違う項目を変えても、変更が消えない。読んだ値の形を確かめ、欠けや違いは既定値で埋める。 |

`src/util/` には、どの拡張でも使える部品を置きます。この拡張のことは知らないので、そのまま残して使えます。
1つの入り口だけが使う部品は、その入り口のフォルダー（`src/wxt/` の中）に置きます。

| ファイル | 役目 |
| --- | --- |
| `Messenger.ts` | 型の付いたメッセージのやり取り。要求と返答の形を、受け取ったときに確かめる。 |
| `SerialQueue.ts` | 非同期の仕事を1つずつ順に動かす。「読んでから書く」保存が重なって、変更が消えるのを防ぐ。 |
| `i18n.ts` | 文言を引く `messageOf`。文言の名前の型は、WXT が文言ファイルから作る。 |
| `useStoredValue.ts` | 保存した値を読み、変わったら描き直す React のフック。読み込む関数と見張る関数を渡して使う。 |
| `guards.ts` | 外から来た値の型を確かめる関数。 |

## 使い方

Node.js 22.13 以上の 22・24、または 26 以上が要ります（ESLint・Vite・Vitest が求める版に合わせています。25 は使えません）。
[proto](https://moonrepo.dev/proto) を使っているなら、`proto use` で `.prototools` に書いた版（Node.js 24）が入ります。

```bash
npm install
```

```bash
npm run dev
```

開発用の Chrome が開き、`https://example.com/` を表示します。
ソースを保存すると、拡張が自動で読み込み直されます。
開発用の Chrome のプロファイルは `.wxt/chrome-data` に残るので、ログインや設定は次に開いたときも残ります。
ただし `.wxt` ごと消える操作（`npx wxt clean` や手での削除）をすると、プロファイルも消えます。
Firefox で試すときは `npm run dev:firefox` を使います。

### 手で読み込むとき

```bash
npm run build
```

Chrome の `chrome://extensions` で「デベロッパー モード」を入れ、「パッケージ化されていない拡張機能を読み込む」から `.output/chrome-mv3` を選びます。

### スクリプトの一覧

| コマンド | すること |
| --- | --- |
| `npm run dev` / `dev:firefox` | 開発用のブラウザーを開き、変更をすぐ反映する |
| `npm run build` / `build:firefox` | 本番用を `.output/` に作る |
| `npm run zip` / `zip:firefox` | ストアに出す zip を作る |
| `npm run format` | ESLint で整形する |
| `npm run lint` | ESLint で検査する |
| `npm run lint:firefox` | Firefox 向けに作り、Firefox の審査で使われる検査（`web-ext lint`）を流す |
| `npm run typecheck` | 型を検査する |
| `npm run test` / `test:watch` | 単体試験を流す |
| `npm run e2e` | 本番用を作り、Playwright と Chrome で E2E 試験を流す |
| `npm run e2e:report` | 最後に流した E2E 試験の報告を、ブラウザーで開く |
| `npm run check` | lint・型検査・単体試験をまとめて流す |

### CI（GitHub Actions）

`.github/workflows/ci.yml` で、lint・型検査・単体試験・Firefox 向けの検査・E2E 試験・zip 作りを流します。20 分を超えたら止めます。
非公開のリポジトリでは Actions に使える時間に上限があるので、初めは止めてあります。push しても、ジョブは飛ばされます。

- **手で流す：** GitHub の Actions の画面で CI を選び、「Run workflow」を押します。
- **自動にする：** リポジトリの Settings → Secrets and variables → Actions → Variables で、`CI_ENABLED` に `true` を入れます。`main` への push とプルリクエストのたびに流れます。止めるときは、変数を消すか `true` 以外にします。

依存の更新は、`.github/dependabot.yml` で Dependabot が月に1回、npm と GitHub Actions のそれぞれ1つのプルリクエストにまとめて知らせます。Dependabot そのものは Actions の時間を使いません。要らないときは、このファイルを消します。

### E2E 試験

`npm run e2e` は、[Playwright](https://playwright.dev/) で画面のない Chrome を開いて拡張を読み込み、ポップアップ・背景・設定画面・内容スクリプトを実際に動かして確かめます。
試験は `test/e2e/` にあります。単体試験は、試す部品の隣に `*.test.ts` か `*.spec.ts` で置いてあります。

- **使うブラウザー：** インストールしてある Google Chrome を使います。Playwright が配る Chromium は使わないので、`npx playwright install` は要りません。Playwright の Chromium は署名がなく、Windows の「スマート アプリ コントロール」が有効だと起動できないためです。
- **拡張の読み込み方：** 正式版の Chrome は、起動時の `--load-extension` を受け付けません。そのため、開いた後に DevTools プロトコルの `Extensions.loadUnpacked` で読み込みます（`test/e2e/fixtures.ts`）。
- **試験どうしの分け方：** Chrome は試験を流す間、1つを使い回します（閉じるのに時間がかかるため）。試験ごとに、保存した値を消し、開いたタブを閉じるので、試験どうしは影響しません。
- **失敗したとき：** `temp/` に画面の写真と操作の記録（trace）が残ります。`npm run e2e:report` で報告を開けます。

## 自分の拡張にするとき

1. `package.json` の `name` と `description`、`public/_locales/*/messages.json` の `extName` と `extDescription` を変える。
   Firefox に出すときは、`wxt.config.ts` の `gecko.id` も自分の ID に変える。
   `LICENSE` の著作者と年も、自分のものに変える。
2. `public/icon/` のアイコンを差し替える（16・32・48・96・128 の PNG）。
3. 内容スクリプトの `matches` を、必要なページだけに絞る。`<all_urls>` のままだと、ストアの審査で理由を聞かれやすい。
4. 要らないサンプルの入り口を消す。`src/wxt/` からフォルダーを消せば、マニフェストからも消える。

### 足すとき

- **入り口を足す** … `src/wxt/` にファイルを置く。名前の付け方は [WXT の説明](https://wxt.dev/guide/essentials/entrypoints.html) を見る。
- **権限を足す** … `wxt.config.ts` の `manifest.permissions` に足す。
- **新しいブラウザーの機能を使う** … その機能が使える版に合わせて、`wxt.config.ts` の `minimum_chrome_version`・`strict_min_version` を上げる。
- **メッセージを足す** … `src/base/protocol.ts` の `Protocol` に型を、`messenger` に確かめる関数を足す。受ける側で `messenger.listen({ 種類: 関数 })` を呼ぶ。
- **保存する値を足す** … `storage.defineItem` で定義する。形を変えるときは `version` を上げ、`migrations` に変換を書く。
  いくつかの値をまとめて持つときは、1つのまとまりにせず、`Settings.ts` のように項目ごとに分けて保存する。
  「読んでから書く」保存（数を増やすなど）は、`SerialQueue` で順番待ちさせる。順番待ちが効くのは同じページの中だけなので、書くのは1か所（背景など）にまとめる。
- **文言を足す** … `public/_locales/ja/messages.json` と `en/messages.json` の両方に足す。`npm run dev` か `npx wxt prepare` を流すと、`messageOf` で型が効く。
  言語のファイルどうしで名前がそろっているかと、HTML や manifest で使う名前がファイルにあるかは、単体試験（`test/locales.test.ts`）が確かめる。

## 決まり

コードの書き方は [docs/coding-style.md](docs/coding-style.md) にあります。
その多くは `npm run lint` で確かめます。

## ライセンス

[MIT](LICENSE)
