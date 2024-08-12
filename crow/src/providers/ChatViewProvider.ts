import { WebviewViewProvider, WebviewView, Uri, ExtensionContext } from 'vscode';
import { GlobalState } from '../utilities/state';
import ChatViewDelegate from '../viewDelegates/ChatViewDelegate';

export default class ChatViewProvider implements WebviewViewProvider {
  public static readonly viewType = 'crow-chat-view';

  constructor(
    private readonly _extensionUri: Uri,
    private readonly _context: ExtensionContext,
    private readonly _session: { [key: string]: any },
  ) {}

  resolveWebviewView(webviewView: WebviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    const chatViewDelegate = new ChatViewDelegate(
      webviewView.webview,
      this._extensionUri,
      this._context,
      this._session,
    );
    webviewView.webview.html = chatViewDelegate.getHtmlForWebview();

    // 登录成功reload
    GlobalState.onDidChangeState(({ key, value }) => {
      if (key === 'isLogin' && value) {
        webviewView.webview.html = chatViewDelegate.getHtmlForWebview();
      }
    });

    chatViewDelegate.setWebviewMessageListener();
  }
}
