// #############################################################################
// MARK: 関数

/**
 * セレクターに合う要素を、決めた型で取り出す。
 * `as` を使わずに型を絞るため、instanceof で確かめる。
 * HTML と食い違って見つからないときは、早く気づけるように例外を投げる。
 */
export function elementOf<TElement extends Element>(
  selector: string,
  type: abstract new () => TElement,
  root: ParentNode = document,
): TElement
{
  const element = root.querySelector(selector);
  if(!(element instanceof type))
  {
    throw new Error(`要素が見つかりません: ${selector}`);
  }
  return element;
}
