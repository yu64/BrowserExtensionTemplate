import type { ComponentProps, ReactNode } from "react";

// #############################################################################
// MARK: 型定義

/**
 * ボタンの見た目の種類。
 * - primary: 画面の中心になる操作。
 * - link: 別の画面へ移る操作。見た目をリンクに寄せる。
 */
type Variant = (
  | "primary"
  | "link"
);

/**
 * ボタンの引数。HTML の button と同じ引数に、見た目の種類を足したもの。
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
 * この拡張のボタン。ポップアップと設定画面で、見た目をそろえるため。
 * 中に出す文字は children で渡す。
 * 押したときにフォームを送らないように、type は既定で "button" にする。
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
