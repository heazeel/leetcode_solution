import { WebviewViewProvider, WebviewView, Uri, ExtensionContext } from 'vscode';
import PlayerViewDelegate from '../viewDelegates/PlayerViewDelegate';

export default class PlayerViewProvider implements WebviewViewProvider {
  public static readonly viewType = 'crow-player-view';

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
    const chatViewDelegate = new PlayerViewDelegate(
      webviewView.webview,
      this._extensionUri,
      this._context,
      this._session,
    );
    webviewView.webview.html = chatViewDelegate.getHtmlForWebview();
    chatViewDelegate.setWebviewMessageListener();
  }
}
