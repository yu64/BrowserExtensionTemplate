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
 * テスト用の、3つの種別を持つインスタンスを作成する。
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
  it("送信したリクエストに、ハンドラーの応答が返る", async () =>
  {
    const messenger = createMessenger();
    messenger.listen({ double: (value) => value * 2 });

    expect(await messenger.send("double", 21)).toBe(42);
  });

  it("リクエストが undefined の種別は、リクエストを省略して送信できる", async () =>
  {
    const messenger = createMessenger();
    messenger.listen({ ping: () => "pong" });

    expect(await messenger.send("ping")).toBe("pong");
  });

  it("リクエストが必要な種別は、省略すると型エラーになる", () =>
  {
    const messenger = createMessenger();

    // 型だけを確認する。関数は呼び出さない。
    expect(() =>
    {
      // @ts-expect-error double には数値のリクエストが必要。
      void messenger.send("double");
    }).toBeTypeOf("function");
  });

  it("非同期のハンドラーの応答も返る", async () =>
  {
    const messenger = createMessenger();
    messenger.listen({ greet: (name) => Promise.resolve(`こんにちは、${name}`) });

    expect(await messenger.send("greet", "WXT")).toBe("こんにちは、WXT");
  });

  it("ハンドラーの例外は、送信側で例外になる", async () =>
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

  it("担当する種別だけに応答する", async () =>
  {
    const messenger = createMessenger();
    messenger.listen({ double: (value) => value * 2 });
    messenger.listen({ greet: (name) => name });

    expect(await messenger.send("double", 2)).toBe(4);
    expect(await messenger.send("greet", "やあ")).toBe("やあ");
  });

  it("リクエストの形式が不正なら、ハンドラーを呼び出さずにエラーを返す", async () =>
  {
    const messenger = createMessenger();
    messenger.listen({ double: (value) => value * 2 });

    // 型では防げない、古い画面などから届いた不正な形式のリクエストを再現する。
    const reply: unknown = await fakeBrowser.runtime.sendMessage({
      type: "double",
      request: "2",
    });

    expect(reply).toEqual({
      ok: false,
      error: "リクエストの形式が不正です: double",
    });
  });

  it("扱わない種別のメッセージには応答しない", async () =>
  {
    const messenger = createMessenger();
    messenger.listen({ double: (value) => value * 2 });

    const reply: unknown = await fakeBrowser.runtime.sendMessage({ type: "unknown" });

    expect(reply).toBeUndefined();
  });

  it("受信を終了したら、応答しない", async () =>
  {
    const messenger = createMessenger();
    const unlisten = messenger.listen({ double: (value) => value * 2 });
    unlisten();

    // リスナーが1つもないときは、ブラウザが送信の時点で例外にする。
    await expect(messenger.send("double", 1)).rejects.toThrow();
  });
});
