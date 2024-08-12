import { Webview, Uri, ExtensionContext, window, ColorTheme, ColorThemeKind } from 'vscode';
import WebViewDelegate from './WebViewDelegate';
import { getNonce, getUri, getUserTheme } from '../utilities/common';
import {
  WebviewMessageDelegate,
  // WebSocketMessageDelegate,
  EventEmitterMessageDelegate,
  MessageDelegate,
  // WebSocketServer,
} from '../utilities/message';
import { GlobalState } from '../utilities/state';
import { USER_INFO_KEY, CROW_USER_INFO } from '../constants';
import eventEmitter from '../utilities/events';
import MessageRegister from '../webMessageCenter/message';
import PlayerRegister from '../webMessageCenter/player';
import fs from 'fs';
import path from 'path';

export default class PlayerViewDelegate implements WebViewDelegate {
  constructor(
    readonly view: Webview,
    readonly extensionUri: Uri,
    readonly context: ExtensionContext,
    readonly session: { [key: string]: any },
  ) {}

  public getHtmlForWebview() {
    const webview: Webview = this.view;
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const stylesUri = getUri(webview, this.extensionUri, [
      'webview-ui',
      'dist',
      'crowChat',
      'main.css',
    ]);
    const scriptUri = getUri(webview, this.extensionUri, [
      'webview-ui',
      'dist',
      'crowChat',
      'main.js',
    ]);

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();
    const theme = getUserTheme(window.activeColorTheme.kind);
    const userInfo =
      GlobalState.get(this.context, CROW_USER_INFO).value ||
      GlobalState.get(this.context, USER_INFO_KEY).value;
    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="aplus-core" content="aplus.js" />
          <title>Chat View</title>
          <script id="_globalValue" nonce="${nonce}">
            window.initTheme = "${theme}";
            window.nonce = "${nonce}";
            window.userInfo = ${JSON.stringify(userInfo)};
            window.isPlayerMode = true;
          </script>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
        </head>
        <body>
          <div id="root"></div>
        </body>
      </html>
      `;
  }

  private messageRegister(messageDelegate: MessageDelegate) {
    new MessageRegister(messageDelegate, this.context).register();
    new PlayerRegister(messageDelegate, this.context).register();

    // 同步用户主题给到web端
    window.onDidChangeActiveColorTheme((e: ColorTheme) => {
      const kind: ColorThemeKind = e.kind;
      const currentColorTheme = getUserTheme(kind);
      this.syncUseThemeToWeb(messageDelegate, currentColorTheme);
    });

    this.syncUseThemeToWeb(messageDelegate);
  }

  private syncUseThemeToWeb(messageDelegate: MessageDelegate, value?: string) {
    const currentColorTheme = !value ? getUserTheme(window.activeColorTheme.kind) : value;
    messageDelegate.postMessage('userThemeColor', currentColorTheme);
  }

  public setWebviewMessageListener() {
    const webviewMessageDelegate = new WebviewMessageDelegate(this.view);
    this.messageRegister(webviewMessageDelegate);

    // 插件内部通信
    const eventEmitterMessageDelegate = new EventEmitterMessageDelegate(eventEmitter);
    eventEmitterMessageDelegate.webviewMessageDelegate = webviewMessageDelegate;
    new PlayerRegister(eventEmitterMessageDelegate, this.context).register();

    // // 用于和 Chrome 通信
    // if (process.env.VSCODE_DEBUG_MODE === 'true') {
    //   new WebSocketServer((webSocketMessageDelegate: WebSocketMessageDelegate) => {
    //     eventEmitterMessageDelegate.webSocketMessageDelegate = webSocketMessageDelegate;
    //     this.messageRegister(webSocketMessageDelegate);
    //   });
    // }
  }
}
