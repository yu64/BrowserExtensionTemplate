import { browser } from "wxt/browser";
import type { Browser } from "wxt/browser";
import { isRecord, isString } from "./guards";
import type { Guard } from "./guards";

// #############################################################################
// MARK: 型定義

/**
 * メッセージの種別ごとの、リクエストとレスポンスの型。
 */
export type ProtocolShape = Record<string, {
  request: unknown;
  response: unknown;
}>;

/**
 * メッセージの種別の名前。
 */
export type MessageType<TProtocol extends ProtocolShape> = Extract<keyof TProtocol, string>;

/**
 * 種別ごとの、リクエストとレスポンスを検証する関数。
 * 拡張機能の内部の通信でも、形式を検証してから使用する。古いバージョンの画面が残っていると、形式が合わないことがあるため。
 */
export type Guards<TProtocol extends ProtocolShape> = {
  [TType in MessageType<TProtocol>]: {
    request: Guard<TProtocol[TType]["request"]>;
    response: Guard<TProtocol[TType]["response"]>;
  };
};

/**
 * 種別ごとの、リクエストを処理してレスポンスを返す関数（ハンドラー）。
 * 担当しない種別は省略する。省略した種別には応答しないので、ほかのリスナーが応答できる。
 */
export type Handlers<TProtocol extends ProtocolShape> = {
  [TType in MessageType<TProtocol>]?: (
    request: TProtocol[TType]["request"],
    sender: Browser.runtime.MessageSender,
  ) => TProtocol[TType]["response"] | Promise<TProtocol[TType]["response"]>;
};

/**
 * 送信する関数の、リクエストの引数。
 * リクエストが `undefined` だけの種別は、リクエストを省略して送信できるようにする。
 * 条件型の条件は、かっこで囲むと構文エラーになるので、全体だけを囲む。
 */
export type RequestArgs<TRequest> = (
  [TRequest] extends [undefined]
  ? [request?: TRequest]
  : [request: TRequest]
);

/**
 * 送信するデータの形式（エンベロープ）。
 */
type Envelope = {
  type: string;
  request: unknown;
};

/**
 * 応答するデータの形式。
 * 受信側で発生したエラーを、送信側で例外として受け取れるようにするため。
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
 * 型付きのメッセージの送受信を担当する。
 * 送信側と受信側で同じインスタンスを使用するので、種別と型の不一致を型検査で検出できる。
 */
export class Messenger<TProtocol extends ProtocolShape>
{
  readonly #guards: Guards<TProtocol>;

  /**
   * @param guards 種別ごとの、リクエストとレスポンスを検証する関数。
   */
  public constructor(guards: Guards<TProtocol>)
  {
    this.#guards = guards;
  }

  // ===========================================================================
  // MARK: 送信

  /**
   * 拡張機能のページとバックグラウンドへ送信し、応答を待つ。
   * コンテンツスクリプトには届かない。コンテンツスクリプトへは `sendToTab` を使用する。
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
   * タブのコンテンツスクリプトへ送信し、応答を待つ。
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
  // MARK: 受信

  /**
   * メッセージの受信を開始する。
   * @returns 受信を終了する関数。
   */
  public listen = (handlers: Handlers<TProtocol>): () => void =>
  {
    const receive = this.#receive;

    /**
     * ブラウザから呼び出されるリスナー。
     * 非同期で応答するときは `true` を返す仕様なので、それに合わせる。
     * Promise を返す書き方は、ブラウザによって動作しないため使用しない。
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
   * 送信するデータを作成する。
   * @param args 送信する関数が受け取ったリクエストの引数。省略したときは、リクエストを `undefined` にする。
   */
  #envelopeOf = (type: string, args: readonly unknown[]): Envelope =>
  {
    return {
      type,
      request: args[0],
    };
  };

  /**
   * 応答のデータから中身を取り出し、検証して返す。
   */
  #valueOf = <TType extends MessageType<TProtocol>>(
    type: TType,
    reply: unknown,
  ): TProtocol[TType]["response"] =>
  {
    // リスナーがいないと、応答は undefined になる。
    if(!isReply(reply))
    {
      throw new Error(`応答がありません: ${type}`);
    }
    if(!reply.ok)
    {
      throw new Error(reply.error);
    }
    const guard = this.#guards[type].response;
    if(!guard(reply.value))
    {
      throw new Error(`レスポンスの形式が不正です: ${type}`);
    }
    return reply.value;
  };

  /**
   * 受信したメッセージを、担当するハンドラーへ渡す。
   * @returns 応答するときは `true`。担当しないときは `undefined`。
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
   * リクエストを検証してからハンドラーを呼び出し、応答のデータを作成する。
   * @returns ハンドラーがないときは `undefined`。
   */
  // 型引数は1回しか使用しないが、ハンドラーと検証する関数の型を、同じ種別で結び付けるために必要。
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
        error: `リクエストの形式が不正です: ${type}`,
      });
    }
    // ハンドラーが同期的に投げた例外も応答に変換するため、then の中で呼び出す。
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
   * 文字列が、このインスタンスが扱う種別かを判定する。
   */
  #isType = (type: string): type is MessageType<TProtocol> =>
  {
    return Object.hasOwn(this.#guards, type);
  };
}

// #############################################################################
// MARK: 内部関数

/**
 * 値が、送信するデータの形式かを判定する。
 */
function isEnvelope(value: unknown): value is Envelope
{
  return isRecord(value) && isString(value.type);
}

/**
 * 値が、応答するデータの形式かを判定する。
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
 * 例外から、送信側に伝えるメッセージを取り出す。
 */
function errorMessageOf(error: unknown): string
{
  return (
    (error instanceof Error)
    ? error.message
    : String(error)
  );
}
