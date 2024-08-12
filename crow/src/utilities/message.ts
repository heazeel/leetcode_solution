import { Webview } from 'vscode';
import { WebSocket, RawData } from 'ws';
import EventEmitter from 'events';
import { Logger } from './logger';

export interface Message {
  type: string;
  content: any;
}

/**
 * WebSocket 服务端
 */
export class WebSocketServer {
  static namespace = 'WebSocketServer';

  constructor(
    readonly connectedCallback: (ws: WebSocketMessageDelegate) => void,
    readonly port: number = 8965,
  ) {
    const wss = new WebSocket.Server({ port });
    Logger.instance.log(`[${WebSocketServer.namespace}] - init`, 'success');

    wss.on('connection', (ws: WebSocket) => {
      Logger.instance.log(`[${WebSocketServer.namespace}] - connection`, 'success');
      connectedCallback(new WebSocketMessageDelegate(ws));
    });
  }
}

export abstract class MessageDelegate {
  public abstract on(type: string, callback: (content: any) => void): void;
  public abstract postMessage(type: string, content: any): void;
}

/**
 * WebSocket 消息代理
 */
export class WebSocketMessageDelegate implements MessageDelegate {
  constructor(readonly websocket: WebSocket) {}

  public on(type: string, callback: (content: any) => void) {
    this.websocket.on('message', (data: RawData) => {
      try {
        const message: Message = JSON.parse(data.toString());
        if (message.type === type) {
          callback(message.content);
        }
      } catch (error) {
        Logger.instance.error(`[${WebSocketServer.namespace}] - message`, data.toString());
      }
    });
  }

  public postMessage(type: string, content: any) {
    return this.websocket.send(
      JSON.stringify({
        type,
        content,
      }),
    );
  }
}

/**
 * 插件内部消息代理
 */
export class EventEmitterMessageDelegate implements MessageDelegate {
  public webSocketMessageDelegate?: WebSocketMessageDelegate;
  public webviewMessageDelegate?: WebviewMessageDelegate;

  constructor(readonly eventEmitter: EventEmitter) {}

  public on(type: string, callback: (content: any) => void) {
    this.eventEmitter.on('message', (data: Message) => {
      try {
        if (data.type === type) {
          callback(data.content);
        }
      } catch (error) {
        Logger.instance.error('[EventEmitterMessageDelegate] - message', data);
      }
    });
  }

  public postMessage(type: string, content: any) {
    // 发送消息给 Webview UI
    this.webviewMessageDelegate?.postMessage(type, content);
    this.webSocketMessageDelegate?.postMessage(type, content);
    // return this.eventEmitter.emit('message', JSON.stringify({
    //   type,
    //   content,
    // }));
  }
}

/**
 * Webview 消息代理，负责消息的监听和发送
 */
export class WebviewMessageDelegate implements MessageDelegate {
  constructor(readonly webview: Webview) {}

  /**
   * 监听消息
   * @param type 消息类型
   * @param callback 消息回调
   */
  public on(type: string, callback: (content: any) => void) {
    // 相关 API 参考 https://code.visualstudio.com/api/references/vscode-api#Webview
    this.webview.onDidReceiveMessage((message: Message) => {
      if (message.type === type) {
        callback(message.content);
      }
    });
  }

  /**
   * 发送消息
   * @param type 消息类型
   * @param content 消息内容
   */
  public postMessage(type: string, content: any) {
    console.log('[CROW LOG]', '[WebviewMessage] - send', { type, content });
    return this.webview.postMessage({
      type,
      content,
    });
  }
}
