import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { loadSettings, updateSettings, watchSettings } from "@/base/Settings";
import type { Settings } from "@/base/Settings";
import { messageOf } from "@/util/i18n";
import { useStoredValue } from "@/util/useStoredValue";

// #############################################################################
// MARK: 型定義

/**
 * 保存できたかの知らせ。
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
 * 「保存しました」を出しておく時間（ミリ秒）。
 */
const statusDuration = 2000;

// #############################################################################
// MARK: コンポーネント

/**
 * 設定画面。
 * 入力を変えたらすぐ保存する。保存の押し忘れをなくすため。
 * 保存した設定を読み終えるまでは何も描かない。古い値をもとに入力されて、保存した値を上書きしないようにするため。
 */
export function OptionsPage(): ReactNode
{
  const settings = useStoredValue(loadSettings, watchSettings);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });

  // 「保存しました」は、しばらくしたら消す。続けて保存したら、そこから数え直す。
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
   * 設定の一部を保存して、保存できたかを知らせる。
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
        // sync の書き込みは、回数や大きさの上限で断られることがある。
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

      {/* 知らせがないときも高さを取っておく（min-h）。出たり消えたりで、画面が上下に動かないようにするため。 */}
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
 * 色の入力欄。選び終えたときだけ知らせる。
 * React の onChange は、色を選ぶ間に何度も呼ばれる。sync の書き込みには回数の上限があるので、
 * ブラウザーの change（選び終えたときに1回だけ届く）を受けて知らせる。
 */
function ColorInput({ id, value, onChange }: ColorInputProps): ReactNode
{
  const ref = useRef<HTMLInputElement>(null);

  // ほかのタブや端末で変わった色を、入力欄に出す。
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
    // null でないと確かめた後の値を、別の名前で持つ。下の関数の中からも、null でない型のまま使えるようにするため。
    const input: HTMLInputElement = ref.current;

    /**
     * 選び終えた色を知らせる。
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
