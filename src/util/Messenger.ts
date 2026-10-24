import { browser } from "wxt/browser";
import type { Browser } from "wxt/browser";
import { isRecord, isString } from "./guards";
import type { Guard } from "./guards";

// #############################################################################
// MARK: 型定義

/**
 * メッセージの種類ごとに、要求と返答の型を並べたもの。
 */
export type ProtocolShape = Record<string, {
  request: unknown;
  response: unknown;
}>;

/**
 * メッセージの種類の名前。
 */
export type MessageType<TProtocol extends ProtocolShape> = Extract<keyof TProtocol, string>;

/**
 * 種類ごとに、要求と返答を確かめる関数を並べたもの。
 * 拡張の中のやり取りでも、形を確かめてから使う。古い版の画面が残っていると、形がずれることがあるため。
 */
export type Guards<TProtocol extends ProtocolShape> = {
  [TType in MessageType<TProtocol>]: {
    request: Guard<TProtocol[TType]["request"]>;
    response: Guard<TProtocol[TType]["response"]>;
  };
};

/**
 * 種類ごとに、要求を受けて返答を作る関数を並べたもの。
 * 受け持たない種類は省く。省いた種類には返答しないので、ほかの受け手が返答できる。
 */
export type Handlers<TProtocol extends ProtocolShape> = {
  [TType in MessageType<TProtocol>]?: (
    request: TProtocol[TType]["request"],
    sender: Browser.runtime.MessageSender,
  ) => TProtocol[TType]["response"] | Promise<TProtocol[TType]["response"]>;
};

/**
 * 送る関数の、要求の引数。
 * 要求が `undefined` だけの種類は、要求を書かずに送れるようにする。
 * 条件型の条件は、かっこで囲むと構文の誤りになるので、全体だけを囲む。
 */
export type RequestArgs<TRequest> = (
  [TRequest] extends [undefined]
  ? [request?: TRequest]
  : [request: TRequest]
);

/**
 * 送るときの包み。
 */
type Envelope = {
  type: string;
  request: unknown;
};

/**
 * 返すときの包み。
 * 受け手で起きた失敗を、送り手で例外として受け取れるようにするため。
 */
type Reply = (
  | {
    ok: true,
    value: unknown,
  }
  | {
    ok: false,
    error: string,
  }
);

// #############################################################################
// MARK: クラス

/**
 * 型の付いたメッセージのやり取りを受け持つ。
 * 送る側も受ける側も同じインスタンスを使うので、種類と型の食い違いを型検査で見つけられる。
 */
export class Messenger<TProtocol extends ProtocolShape>
{
  readonly #guards: Guards<TProtocol>;

  /**
   * @param guards 種類ごとに、要求と返答を確かめる関数。
   */
  public constructor(guards: Guards<TProtocol>)
  {
    this.#guards = guards;
  }

  // ===========================================================================
  // MARK: 送る

  /**
   * 拡張のページと背景（background）へ送り、返答を待つ。
   * 内容スクリプトには届かない。内容スクリプトへは `sendToTab` を使う。
   */
  public send = async <TType extends MessageType<TProtocol>>(
    type: TType,
    ...args: RequestArgs<TProtocol[TType]["request"]>
  ): Promise<TProtocol[TType]["response"]> =>
  {
    const reply: unknown = await browser.runtime.sendMessage(this.#envelopeOf(type, args));
    return this.#valueOf(type, reply);
  };

  /**
   * タブの内容スクリプトへ送り、返答を待つ。
   */
  public sendToTab = async <TType extends MessageType<TProtocol>>(
    tabId: number,
    type: TType,
    ...args: RequestArgs<TProtocol[TType]["request"]>
  ): Promise<TProtocol[TType]["response"]> =>
  {
    const reply: unknown = await browser.tabs.sendMessage(tabId, this.#envelopeOf(type, args));
    return this.#valueOf(type, reply);
  };

  // ===========================================================================
  // MARK: 受ける

  /**
   * メッセージを受け始める。
   * @returns 受けるのをやめる関数。
   */
  public listen = (handlers: Handlers<TProtocol>): () => void =>
  {
    const receive = this.#receive;

    /**
     * ブラウザーから呼ばれる受け手。
     * 返答を非同期で返すときは `true` を返す決まりなので、その形に合わせる。
     * Promise を返す書き方は、ブラウザーによって動かないため使わない。
     */
    function listener(
      message: unknown,
      sender: Browser.runtime.MessageSender,
      sendResponse: (reply: Reply) => void,
    ): true | undefined
    {
      return receive(handlers, message, sender, sendResponse);
    }

    browser.runtime.onMessage.addListener(listener);
    return () =>
    {
      browser.runtime.onMessage.removeListener(listener);
    };
  };

  // ===========================================================================
  // MARK: 内部関数

  /**
   * 送る包みを作る。
   * @param args 送る関数が受けた要求の引数。省いたときは、要求を `undefined` にする。
   */
  #envelopeOf = (type: string, args: readonly unknown[]): Envelope =>
  {
    return {
      type,
      request: args[0],
    };
  };

  /**
   * 返答の包みを開き、中身を確かめて返す。
   */
  #valueOf = <TType extends MessageType<TProtocol>>(
    type: TType,
    reply: unknown,
  ): TProtocol[TType]["response"] =>
  {
    // 受け手がいないと、返答は undefined になる。
    if(!isReply(reply))
    {
      throw new Error(`返答がありません: ${type}`);
    }
    if(!reply.ok)
    {
      throw new Error(reply.error);
    }
    const guard = this.#guards[type].response;
    if(!guard(reply.value))
    {
      throw new Error(`返答の形が違います: ${type}`);
    }
    return reply.value;
  };

  /**
   * 届いたメッセージを、受け持つ関数へ渡す。
   * @returns 返答するときは `true`。受け持たないときは `undefined`。
   */
  #receive = (
    handlers: Handlers<TProtocol>,
    message: unknown,
    sender: Browser.runtime.MessageSender,
    sendResponse: (reply: Reply) => void,
  ): true | undefined =>
  {
    if(!isEnvelope(message) || !this.#isType(message.type))
    {
      return undefined;
    }
    const reply = this.#replyOf(handlers, message.type, message.request, sender);
    if(reply === undefined)
    {
      return undefined;
    }
    void reply.then(sendResponse);
    return true;
  };

  /**
   * 要求を確かめてから受け持つ関数を呼び、返答の包みを作る。
   * @returns 受け持つ関数がないときは `undefined`。
   */
  // 型引数は1度しか出てこないが、受け持つ関数と確かめる関数の型を同じ種類で結び付けるために要る。
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  #replyOf = <TType extends MessageType<TProtocol>>(
    handlers: Handlers<TProtocol>,
    type: TType,
    request: unknown,
    sender: Browser.runtime.MessageSender,
  ): Promise<Reply> | undefined =>
  {
    const handler = handlers[type];
    if(handler === undefined)
    {
      return undefined;
    }
    const guard = this.#guards[type].request;
    if(!guard(request))
    {
      return Promise.resolve({
        ok: false,
        error: `要求の形が違います: ${type}`,
      });
    }
    // 受け持つ関数が同期で投げた例外も、返答に変えるため、then の中で呼ぶ。
    return Promise.resolve()
      .then(() => handler(request, sender))
      .then(
        (value): Reply => ({
          ok: true,
          value,
        }),
        (error: unknown): Reply => ({
          ok: false,
          error: errorMessageOf(error),
        }),
      );
  };

  /**
   * 文字列が、このインスタンスの知っている種類かを調べる。
   */
  #isType = (type: string): type is MessageType<TProtocol> =>
  {
    return Object.hasOwn(this.#guards, type);
  };
}

// #############################################################################
// MARK: 内部関数

/**
 * 値が、送るときの包みかを調べる。
 */
function isEnvelope(value: unknown): value is Envelope
{
  return isRecord(value) && isString(value.type);
}

/**
 * 値が、返すときの包みかを調べる。
 */
function isReply(value: unknown): value is Reply
{
  if(!isRecord(value))
  {
    return false;
  }
  return (
    value.ok === true
    || (value.ok === false && isString(value.error))
  );
}

/**
 * 例外から、送り手に伝える文を取り出す。
 */
function errorMessageOf(error: unknown): string
{
  return (
    (error instanceof Error)
    ? error.message
    : String(error)
  );
}
