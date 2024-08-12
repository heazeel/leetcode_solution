import { Webview, Uri, ExtensionContext, window, ColorTheme, ColorThemeKind } from 'vscode';
import { ChatMode } from '../types';
import WebViewDelegate from './WebViewDelegate';
import { getNonce, getUri, getUserTheme } from '../utilities/common';
import {
  WebviewMessageDelegate,
  WebSocketMessageDelegate,
  EventEmitterMessageDelegate,
  WebSocketServer,
  MessageDelegate,
} from '../utilities/message';
import { GlobalState } from '../utilities/state';
import { CHAT_MODE_KEY, USER_INFO_KEY, CROW_USER_INFO } from '../constants';
import { FreeChat, DevMind } from '../utilities/chat';
import eventEmitter from '../utilities/events';
import MessageRegister from '../webMessageCenter/message';
import ClipboardRegister from '../webMessageCenter/clipboard';
import FloatOperationRegister from '../webMessageCenter/float';
import TextEditorRegister from '../webMessageCenter/textEditor';
import FileRegister from '../webMessageCenter/file';
import FreeChatRegister from '../webMessageCenter/freeChat';
import DevMindRegister from '../webMessageCenter/devMind';
import ShortcutRegister from '../webMessageCenter/shortcut';
import SessionsRegister from '../webMessageCenter/sessions';
import AuthRegister from '../webMessageCenter/auth';
import { AuthUriHandler } from '../utilities/uriHandler';

export default class ChatViewDelegate implements WebViewDelegate {
  private freeChat: FreeChat;
  private devMind: DevMind;

  constructor(
    readonly view: Webview,
    readonly extensionUri: Uri,
    readonly context: ExtensionContext,
    readonly session: { [key: string]: any },
  ) {
    this.freeChat = new FreeChat(context);
    this.devMind = new DevMind(context);
  }

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

  // 登出
  private async syncLogOutToWeb(messageDelegate: MessageDelegate, isLogin: boolean) {
    if (!isLogin) {
      await this.context.secrets.delete('uuid');
      messageDelegate.postMessage('logOut', {});
      GlobalState.set(this.context, CROW_USER_INFO, '');
    }
  }

  private syncChatModeToWeb(messageDelegate: MessageDelegate, value?: ChatMode) {
    const isDevMindMode = value
      ? value === ChatMode.DevMind
      : GlobalState.get(this.context, CHAT_MODE_KEY).value === ChatMode.DevMind;
    messageDelegate.postMessage('isDevMindMode', isDevMindMode);
  }

  private messageRegister(messageDelegate: MessageDelegate) {
    new MessageRegister(messageDelegate, this.context).register();
    new ClipboardRegister(messageDelegate, this.context).register();
    new FloatOperationRegister(messageDelegate, this.context).register();
    new TextEditorRegister(messageDelegate, this.context).register();
    new FileRegister(messageDelegate, this.context).register();
    new FreeChatRegister(messageDelegate, this.context).register(this.freeChat);
    new DevMindRegister(messageDelegate, this.context).register(this.devMind);
    new ShortcutRegister(messageDelegate, this.context).register();
    new SessionsRegister(messageDelegate, this.context).register();
    new AuthRegister(messageDelegate, this.context).register();

    // 同步 ChatMode
    GlobalState.onDidChangeState(({ key, value }) => {
      if (key === 'isLogin') {
        this.syncLogOutToWeb(messageDelegate, value);
      }
      if (key === 'chatMode') {
        this.syncChatModeToWeb(messageDelegate, value);
      }

      if (key === 'useTestMode') {
        messageDelegate.postMessage('useTestMod', value);
      }

      // 上传vsix到oss
      if (key === 'useUploadMode') {
        messageDelegate.postMessage('useUploadMode', value);
      }

      if (key === 'setInputFocus') {
        messageDelegate.postMessage('setInputFocus', value);
      }
    });

    // 同步用户主题给到web端
    window.onDidChangeActiveColorTheme((e: ColorTheme) => {
      const kind: ColorThemeKind = e.kind;
      const currentColorTheme = getUserTheme(kind);
      this.syncUseThemeToWeb(messageDelegate, currentColorTheme);
    });

    this.syncChatModeToWeb(messageDelegate);
    this.syncUseThemeToWeb(messageDelegate);
  }

  private syncUseThemeToWeb(messageDelegate: MessageDelegate, value?: string) {
    const currentColorTheme = !value ? getUserTheme(window.activeColorTheme.kind) : value;
    messageDelegate.postMessage('userThemeColor', currentColorTheme);
  }

  public setWebviewMessageListener() {
    const webviewMessageDelegate = new WebviewMessageDelegate(this.view);
    // 监听鉴权uri信息
    new AuthUriHandler(webviewMessageDelegate, this.context);
    this.messageRegister(webviewMessageDelegate);

    // 插件内部通信
    const eventEmitterMessageDelegate = new EventEmitterMessageDelegate(eventEmitter);
    eventEmitterMessageDelegate.webviewMessageDelegate = webviewMessageDelegate;
    new ShortcutRegister(eventEmitterMessageDelegate, this.context).register();
    new SessionsRegister(eventEmitterMessageDelegate, this.context).register();
    // 插件内部监听 Webview UI 初始化完成
    webviewMessageDelegate.on('@WEBVIEW_INIT', () => {
      this.session.webViewInit = true;
      eventEmitter.emit('@WEBVIEW_INIT');
    });

    // 用于和 Chrome 通信
    if (process.env.VSCODE_DEBUG_MODE === 'true') {
      new WebSocketServer((webSocketMessageDelegate: WebSocketMessageDelegate) => {
        eventEmitterMessageDelegate.webSocketMessageDelegate = webSocketMessageDelegate;
        this.messageRegister(webSocketMessageDelegate);
      });
    }
  }
}
