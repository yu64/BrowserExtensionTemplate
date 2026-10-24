import type { ComponentProps, ReactNode } from "react";

// #############################################################################
// MARK: 型定義

/**
 * ボタンの見た目の種類。
 * - primary: 画面の主な操作。
 * - link: 別の画面へ移動する操作。見た目をリンクに近づける。
 */
type Variant = (
  | "primary"
  | "link"
);

/**
 * ボタンの引数。HTML の button と同じ引数に、見た目の種類を追加したもの。
 */
export type Props = ComponentProps<"button"> & {
  variant?: Variant;
};

// #############################################################################
// MARK: 定数

/**
 * 見た目の種類ごとのクラス。
 */
const variantClasses: Record<Variant, string> = {
  primary: "cursor-pointer rounded-md bg-accent px-3 py-1.5 text-on-accent hover:brightness-110",
  link: "cursor-pointer text-accent underline",
};

// #############################################################################
// MARK: コンポーネント

/**
 * この拡張機能のボタン。ポップアップと設定画面で、見た目を統一するため。
 * 表示する文字は children で渡す。
 * 押したときにフォームを送信しないように、type の初期値は "button" にする。
 */
export function Button({ variant = "primary", className, ...rest }: Props): ReactNode
{
  return (
    <button
      type="button"
      {...rest}
      className={[variantClasses[variant], className].filter((name) => name !== undefined).join(" ")}
    />
  );
}
