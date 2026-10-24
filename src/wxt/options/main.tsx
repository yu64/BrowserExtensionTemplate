import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/style/app.css";
import { messageOf } from "@/util/i18n";
import { OptionsPage } from "./OptionsPage";

// #############################################################################
// MARK: 初期化

// 画面の言語と題名は、実際に使われた言語のファイルから引く。
// 利用者の言語のファイルがなく、既定の言語で出したときも、正しい言語を示せるようにするため。
document.documentElement.lang = messageOf("htmlLang");
document.title = messageOf("optionsTitle");

const root = document.getElementById("root");
if(root === null) throw new Error("描く場所（#root）がありません。");
createRoot(root).render(
  <StrictMode>
    <OptionsPage />
  </StrictMode>,
);
