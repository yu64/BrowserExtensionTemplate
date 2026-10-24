import { useEffect, useState } from "react";

// #############################################################################
// MARK: フック

/**
 * 保存した値を読み、変わったら描き直す。
 * 設定や数など、どの保存した値にも使えるように、読み込む関数と見張る関数を受け取る。
 * 渡す関数は、描くたびに作り直さないもの（ファイルの外で定義した関数など）にする。作り直すと、毎回読み直すため。
 * @param load 保存した値を読む関数。
 * @param watch 値が変わるのを見張る関数。見張るのをやめる関数を返す。
 * @returns 読み終えるまでは `undefined`。
 */
export function useStoredValue<TValue>(
  load: () => Promise<TValue>,
  watch: (onChange: (value: TValue) => void) => () => void,
): TValue | undefined
{
  const [value, setValue] = useState<TValue | undefined>(undefined);

  useEffect(() =>
  {
    // 見張りを先に始める。読み込む間に値が変わっても、取りこぼさないようにするため。
    // 画面を閉じた後に届いた値では描き直さない。
    let active = true;
    const unwatch = watch((next) =>
    {
      if(active)
      {
        setValue(next);
      }
    });
    void load().then((loaded) =>
    {
      // 読み込む間に見張りから新しい値が届いていたら、そちらを残す。
      if(active)
      {
        setValue((current) => current ?? loaded);
      }
    });
    return () =>
    {
      active = false;
      unwatch();
    };
  }, [load, watch]);

  return value;
}
