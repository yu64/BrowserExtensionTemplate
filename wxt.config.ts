import { defineConfig } from "wxt";

// #############################################################################
// MARK: 設定

/**
 * WXT の設定。
 * WXT が既定の書き出しを求めるため、このファイルだけは default export にする。
 * @see https://wxt.dev/api/config.html
 */
export default defineConfig({
  // ソースを src にまとめる。設定ファイルとソースを見分けやすくするため。
  srcDir: "src",
  // 入り口（WXT がマニフェストを作るもとになるファイル）は src/wxt に置く。
  // WXT の決まりに従う場所だと、名前で分かるようにするため。
  entrypointsDir: "wxt",
  // 自動の読み込みを切る。どこから来た値かを、import の行で読めるようにするため。
  imports: false,
  manifest: ({ browser }) => ({
    // 名前と説明は、言語ごとのファイル（public/_locales）から引く。
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    // 利用者の言語の文言がないときに使う言語。日本語でも英語でもない人には、英語で出すため。
    default_locale: "en",
    permissions: ["storage"],
    // ブラウザーごとの設定。相手のブラウザーが知らない項目を出すと警告が出るので、分けて足す。
    ...(
      (browser === "firefox")
      ? {
        browser_specific_settings: {
          gecko: {
            // storage.sync を使うには、拡張の ID が要る。自分の拡張にするときに書き換える。
            id: "extension-template@example.com",
            // data_collection_permissions を読めるのが Firefox 140 からなので、それより前には入れさせない。
            strict_min_version: "140.0",
            // この拡張は、利用者のデータをどこにも送らない。Firefox は新しい拡張にこの申告を求める。
            data_collection_permissions: { required: ["none"] },
          },
          // Android 版の Firefox が data_collection_permissions を読めるのは 142 からなので、分けて決める。
          gecko_android: { strict_min_version: "142.0" },
        },
      }
      : {
        // runtime.sendMessage・tabs.sendMessage が Promise を返すのが Chrome 99 からなので、それより前には入れさせない。
        minimum_chrome_version: "99",
      }
    ),
  }),
  webExt: {
    // 開発用のブラウザーで最初に開くページ。内容スクリプトをすぐ試せるようにするため。
    startUrls: ["https://example.com/"],
    // 開発用の Chrome のプロファイルを残す。ログインや設定を、開き直すたびにやり直さずに済むため。
    // .wxt は git に載せないので、人ごとのプロファイルになる。
    chromiumArgs: ["--user-data-dir=./.wxt/chrome-data"],
    // 人ごとに変えたいときは、web-ext.config.ts を作って上書きする（git には載せない）。
  },
});
