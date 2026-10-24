import { describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { isNumber, isString, isUndefined } from "./guards";
import { Messenger } from "./Messenger";

type TestProtocol = {
  ping: {
    request: undefined;
    response: string;
  };
  double: {
    request: number;
    response: number;
  };
  greet: {
    request: string;
    response: string;
  };
};

/**
 * 試験で使う、3つの種類を持つ窓口を作る。
 */
function createMessenger(): Messenger<TestProtocol>
{
  return new Messenger<TestProtocol>({
    ping: {
      request: isUndefined,
      response: isString,
    },
    double: {
      request: isNumber,
      response: isNumber,
    },
    greet: {
      request: isString,
      response: isString,
    },
  });
}

describe("Messenger", () =>
{
  it("送った要求に、受け手の返答が返る", async () =>
  {
    const messenger = createMessenger();
    messenger.listen({ double: (value) => value * 2 });

    expect(await messenger.send("double", 21)).toBe(42);
  });

  it("要求が undefined の種類は、要求を省いて送れる", async () =>
  {
    const messenger = createMessenger();
    messenger.listen({ ping: () => "pong" });

    expect(await messenger.send("ping")).toBe("pong");
  });

  it("要求の要る種類は、要求を省くと型の誤りになる", () =>
  {
    const messenger = createMessenger();

    // 型だけを確かめる。関数は呼ばない。
    expect(() =>
    {
      // @ts-expect-error double には数の要求が要る。
      void messenger.send("double");
    }).toBeTypeOf("function");
  });

  it("非同期の受け手の返答も返る", async () =>
  {
    const messenger = createMessenger();
    messenger.listen({ greet: (name) => Promise.resolve(`こんにちは、${name}`) });

    expect(await messenger.send("greet", "WXT")).toBe("こんにちは、WXT");
  });

  it("受け手の例外は、送り手で例外になる", async () =>
  {
    const messenger = createMessenger();
    messenger.listen({
      double: () =>
      {
        throw new Error("失敗しました");
      },
    });

    await expect(messenger.send("double", 1)).rejects.toThrow("失敗しました");
  });

  it("受け持つ種類だけに返答する", async () =>
  {
    const messenger = createMessenger();
    messenger.listen({ double: (value) => value * 2 });
    messenger.listen({ greet: (name) => name });

    expect(await messenger.send("double", 2)).toBe(4);
    expect(await messenger.send("greet", "やあ")).toBe("やあ");
  });

  it("要求の形が違えば、受け手を呼ばずに例外にする", async () =>
  {
    const messenger = createMessenger();
    messenger.listen({ double: (value) => value * 2 });

    // 型では防げない、古い画面などから届いた形の違う要求をまねる。
    const reply: unknown = await fakeBrowser.runtime.sendMessage({
      type: "double",
      request: "2",
    });

    expect(reply).toEqual({
      ok: false,
      error: "要求の形が違います: double",
    });
  });

  it("知らない種類のメッセージには返答しない", async () =>
  {
    const messenger = createMessenger();
    messenger.listen({ double: (value) => value * 2 });

    const reply: unknown = await fakeBrowser.runtime.sendMessage({ type: "unknown" });

    expect(reply).toBeUndefined();
  });

  it("受けるのをやめたら、返答しない", async () =>
  {
    const messenger = createMessenger();
    const unlisten = messenger.listen({ double: (value) => value * 2 });
    unlisten();

    // 受け手が1つもないときは、ブラウザーが送る時点で例外にする。
    await expect(messenger.send("double", 1)).rejects.toThrow();
  });
});
