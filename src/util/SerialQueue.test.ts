import { describe, expect, it } from "vitest";
import { SerialQueue } from "./SerialQueue";

/**
 * 決めた時間だけ待つ。
 */
function delay(milliseconds: number): Promise<void>
{
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

describe("SerialQueue", () =>
{
  it("読んでから書く仕事が重なっても、変更が消えない", async () =>
  {
    const queue = new SerialQueue();
    let stored = 0;

    /**
     * 読んでから、少し待って書く。待つ間に別の仕事が割り込めるようにする。
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

  it("仕事が失敗しても、次の仕事は動く", async () =>
  {
    const queue = new SerialQueue();

    const failed = queue.run(() => Promise.reject(new Error("失敗しました")));
    const next = queue.run(() => Promise.resolve("動きました"));

    await expect(failed).rejects.toThrow("失敗しました");
    expect(await next).toBe("動きました");
  });
});
