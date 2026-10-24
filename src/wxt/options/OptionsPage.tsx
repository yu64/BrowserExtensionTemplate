import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { loadSettings, updateSettings, watchSettings } from "@/base/Settings";
import type { Settings } from "@/base/Settings";
import { messageOf } from "@/util/i18n";
import { useStoredValue } from "@/util/useStoredValue";

// #############################################################################
// MARK: 型定義

/**
 * 保存の結果の通知。
 */
type SaveStatus = (
  | { kind: "idle" }
  | { kind: "saved" }
  | { kind: "failed" }
);

/**
 * 色の入力欄の引数。
 */
type ColorInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
};

// #############################################################################
// MARK: 定数

/**
 * 「保存しました」を表示しておく時間（ミリ秒）。
 */
const statusDuration = 2000;

// #############################################################################
// MARK: コンポーネント

/**
 * 設定画面。
 * 入力を変更したら、すぐに保存する。保存の押し忘れを防ぐため。
 * 保存済みの設定を取得するまでは、何も描画しない。古い値をもとに入力されて、保存済みの値を上書きしないようにするため。
 */
export function OptionsPage(): ReactNode
{
  const settings = useStoredValue(loadSettings, watchSettings);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });

  // 「保存しました」は、一定時間後に非表示にする。連続で保存したら、そこから計測し直す。
  useEffect(() =>
  {
    if(status.kind !== "saved") return undefined;
    const timer = window.setTimeout(() =>
    {
      setStatus({ kind: "idle" });
    }, statusDuration);
    return () =>
    {
      window.clearTimeout(timer);
    };
  }, [status]);

  if(settings === undefined) return undefined;

  /**
   * 設定の一部を保存して、結果を通知する。
   */
  function save(patch: Partial<Settings>): void
  {
    updateSettings(patch).then(
      () =>
      {
        setStatus({ kind: "saved" });
      },
      (reason: unknown) =>
      {
        // sync への保存は、回数やサイズの上限によって失敗することがある。
        console.error(reason);
        setStatus({ kind: "failed" });
      },
    );
  }

  return (
    <main className="mx-auto grid max-w-[640px] gap-6 px-4 py-8">
      <h1 className="text-lg font-bold">{messageOf("optionsTitle")}</h1>

      <form
        id="settings"
        className="grid gap-3"
        onSubmit={(event) =>
        {
          event.preventDefault();
        }}
      >
        <label className="flex cursor-pointer items-center gap-2">
          <input
            id="links-highlighted"
            name="linksHighlighted"
            type="checkbox"
            checked={settings.linksHighlighted}
            onChange={(event) =>
            {
              save({ linksHighlighted: event.currentTarget.checked });
            }}
          />
          <span>{messageOf("optionsLinksHighlighted")}</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <ColorInput
            id="highlight-color"
            value={settings.highlightColor}
            onChange={(highlightColor) =>
            {
              save({ highlightColor });
            }}
          />
          <span>{messageOf("optionsHighlightColor")}</span>
        </label>
      </form>

      {/* 通知がないときも高さを確保する（min-h）。表示・非表示の切り替えで、画面が上下に動かないようにするため。 */}
      <p id="status" className={(status.kind === "failed" ? "min-h-[1.5em] text-danger" : "min-h-[1.5em] text-ink-muted")} aria-live="polite">
        {(status.kind === "saved") && messageOf("optionsSaved")}
        {(status.kind === "failed") && messageOf("optionsSaveFailed")}
      </p>
    </main>
  );
}

// #############################################################################
// MARK: 内部部品

/**
 * 色の入力欄。色の選択が完了したときだけ通知する。
 * React の onChange は、色の選択中に何度も呼び出される。sync への保存には回数の上限があるので、
 * ブラウザの change イベント（選択が完了したときに1回だけ発生する）を受けて通知する。
 */
function ColorInput({ id, value, onChange }: ColorInputProps): ReactNode
{
  const ref = useRef<HTMLInputElement>(null);

  // ほかのタブや端末で変更された色を、入力欄に表示する。
  useEffect(() =>
  {
    if(ref.current !== null)
    {
      ref.current.value = value;
    }
  }, [value]);

  useEffect(() =>
  {
    if(ref.current === null) return undefined;
    // null でないことを確認した後の値を、別の変数で保持する。下の関数の中からも、null でない型のまま使用するため。
    const input: HTMLInputElement = ref.current;

    /**
     * 選択した色を通知する。
     */
    function handleChange(): void
    {
      onChange(input.value);
    }

    input.addEventListener("change", handleChange);
    return () =>
    {
      input.removeEventListener("change", handleChange);
    };
  }, [onChange]);

  return <input ref={ref} id={id} type="color" defaultValue={value} />;
}
