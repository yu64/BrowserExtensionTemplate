import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// #############################################################################
// MARK: 設定

/**
 * WXT の設定。
 * WXT が default export を求めるため、default export にする。
 * @see https://wxt.dev/api/config.html
 */
export default defineConfig({
  // ソースを src にまとめる。設定ファイルとソースを区別しやすくするため。
  srcDir: "src",
  // エントリポイント（WXT が manifest を生成する元のファイル）は src/wxt に置く。
  // WXT のルールに従う場所であることを、名前で分かるようにするため。
  entrypointsDir: "wxt",
  // 自動インポートを無効にする。値の取得元を、import の行で確認できるようにするため。
  imports: false,
  // 拡張機能のページ（ポップアップ・設定画面）を React で作成する。
  // React を import しないエントリポイント（バックグラウンド・コンテンツスクリプト）の出力には、React は含まれない。
  modules: ["@wxt-dev/module-react"],
  // 拡張機能のページのスタイルは Tailwind CSS で指定する（src/style/app.css）。
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: ({ browser }) => ({
    // 名前と説明は、言語ごとのメッセージファイル（public/_locales）から取得する。
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    // ユーザの言語のメッセージがないときに使用する言語。日本語でも英語でもないユーザには、英語で表示するため。
    default_locale: "en",
    permissions: ["storage"],
    // ブラウザごとの設定。対応していない項目を含めると警告が出るので、ブラウザごとに分けて追加する。
    ...(
      (browser === "firefox")
      ? {
        browser_specific_settings: {
          gecko: {
            // storage.sync を使用するには、拡張機能の ID が必要。自分の拡張機能にするときに変更する。
            id: "extension-template@example.com",
            // data_collection_permissions に対応したのが Firefox 140 からなので、それより前のバージョンにはインストールさせない。
            strict_min_version: "140.0",
            // この拡張機能は、ユーザのデータを外部に送信しない。Firefox は新しい拡張機能にこの申告を求める。
            data_collection_permissions: { required: ["none"] },
          },
          // Android 版の Firefox が data_collection_permissions に対応したのは 142 からなので、別に指定する。
          gecko_android: { strict_min_version: "142.0" },
        },
      }
      : {
        // runtime.sendMessage・tabs.sendMessage が Promise を返すのが Chrome 99 からなので、それより前のバージョンにはインストールさせない。
        minimum_chrome_version: "99",
      }
    ),
  }),
  webExt: {
    // 開発用のブラウザで最初に開くページ。コンテンツスクリプトをすぐに試せるようにするため。
    startUrls: ["https://example.com/"],
    // 開発用の Chrome のプロファイルを保持する。ログインや設定を、起動のたびにやり直さずに済むため。
    // .wxt は git の管理対象外なので、開発者ごとのプロファイルになる。
    chromiumArgs: ["--user-data-dir=./.wxt/chrome-data"],
    // 開発者ごとに変更したいときは、web-ext.config.ts を作成して上書きする（git の管理対象外）。
  },
});
