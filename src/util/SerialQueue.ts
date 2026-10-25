// #############################################################################
// MARK: クラス

/**
 * 非同期の処理を、1つずつ順番に実行する。
 * 「取得してから保存する」処理が重なると、後の処理が先の処理の保存した値を上書きし、変更が失われる。
 * それを防ぐため、前の処理が完了してから次の処理を開始する。
 */
export class SerialQueue
{
  /** 最後に追加した処理の完了を表す。失敗しても次の処理を止めないように、失敗は無視する。 */
  #tail: Promise<void> = Promise.resolve();

  /**
   * 処理をキューの末尾に追加する。
   * @returns その処理の結果。処理が失敗したら、この Promise も失敗する。
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
