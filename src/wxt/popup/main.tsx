import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/style/app.css";
import { messageOf } from "@/util/i18n";
import { PopupPage } from "./PopupPage";

// #############################################################################
// MARK: 初期化

// 画面の言語とタイトルは、実際に使用された言語のメッセージファイルから取得する。
// ユーザの言語のファイルがなく、既定の言語で表示したときも、正しい言語を設定するため。
document.documentElement.lang = messageOf("htmlLang");
document.title = messageOf("extName");

const root = document.getElementById("root");
if(root === null) throw new Error("描画先の要素（#root）がありません。");
createRoot(root).render(
  <StrictMode>
    <PopupPage />
  </StrictMode>,
);
