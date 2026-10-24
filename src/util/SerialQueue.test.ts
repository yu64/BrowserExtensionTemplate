import { describe, expect, it } from "vitest";
import { SerialQueue } from "./SerialQueue";

/**
 * 指定した時間だけ待つ。
 */
function delay(milliseconds: number): Promise<void>
{
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

describe("SerialQueue", () =>
{
  it("取得してから保存する処理が重なっても、変更が失われない", async () =>
  {
    const queue = new SerialQueue();
    let stored = 0;

    /**
     * 取得してから、少し待って保存する。待つ間に別の処理が割り込めるようにする。
     */
    async function increment(): Promise<number>
    {
      const current = stored;
      await delay(5);
      stored = current + 1;
      return stored;
    }

    const results = await Promise.all([
      queue.run(increment),
      queue.run(increment),
      queue.run(increment),
    ]);

    expect(results).toEqual([1, 2, 3]);
    expect(stored).toBe(3);
  });

  it("処理が失敗しても、次の処理は実行される", async () =>
  {
    const queue = new SerialQueue();

    const failed = queue.run(() => Promise.reject(new Error("失敗しました")));
    const next = queue.run(() => Promise.resolve("実行しました"));

    await expect(failed).rejects.toThrow("失敗しました");
    expect(await next).toBe("実行しました");
  });
});
