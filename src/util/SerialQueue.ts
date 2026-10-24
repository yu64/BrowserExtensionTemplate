// #############################################################################
// MARK: クラス

/**
 * 非同期の仕事を、1つずつ順に動かす。
 * 「読んでから書く」仕事が重なると、後の仕事が先の仕事の書いた値を上書きして、変更が消える。
 * それを防ぐため、前の仕事が終わってから次の仕事を始める。
 */
export class SerialQueue
{
  /** いちばん後ろの仕事が終わるのを表す。失敗しても次の仕事を止めないように、失敗は握りつぶしておく。 */
  #tail: Promise<void> = Promise.resolve();

  /**
   * 仕事を列の後ろに足す。
   * @returns その仕事の結果。仕事が失敗したら、この Promise も失敗する。
   */
  public run = <TResult>(task: () => Promise<TResult>): Promise<TResult> =>
  {
    const result = this.#tail.then(task);
    this.#tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
