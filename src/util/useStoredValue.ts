import { useEffect, useState } from "react";

// #############################################################################
// MARK: フック

/**
 * 保存済みの値を取得し、変更されたら再描画する。
 * 設定やカウンターなど、どの保存済みの値にも使えるように、取得する関数と監視する関数を受け取る。
 * 渡す関数は、描画のたびに作り直さないもの（ファイルの外で定義した関数など）にする。作り直すと、毎回取得し直すため。
 * @param get 保存済みの値を取得する関数。
 * @param watch 値の変更を監視する関数。監視を終了する関数を返す。
 * @returns 取得が完了するまでは `undefined`。
 */
export function useStoredValue<TValue>(
  get: () => Promise<TValue>,
  watch: (onChange: (value: TValue) => void) => () => void,
): TValue | undefined
{
  const [value, setValue] = useState<TValue | undefined>(undefined);

  useEffect(() =>
  {
    // 監視を先に開始する。取得中に値が変更されても、取りこぼさないようにするため。
    // 画面を閉じた後に届いた値では、再描画しない。
    let active = true;
    const unwatch = watch((next) =>
    {
      if(active)
      {
        setValue(next);
      }
    });
    void get().then((loaded) =>
    {
      // 取得中に監視から新しい値が届いていたら、そちらを優先する。
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
  }, [get, watch]);

  return value;
}
