import * as vscode from 'vscode';
import InlineChatDelegate from '../viewDelegates/InlineChatDelegate';

export default class InlineChatProvider {
  private context: vscode.ExtensionContext;
  private webviewTextEditorInset: vscode.WebviewEditorInset | null = null;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    vscode.window.onDidChangeTextEditorSelection((event) => {
      this.disposeWebviewTextEditorInset();
    });
  }

  public createWebviewTextEditorInset(textEditor?: vscode.TextEditor) {
    if (!textEditor || this.webviewTextEditorInset) {
      return;
    }

    this.webviewTextEditorInset = vscode.window.createWebviewTextEditorInset(
      textEditor,
      textEditor.selection.end.line,
      3,
      {
        enableScripts: true,
        localResourceRoots: [this.context.extensionUri],
      },
    );

    const inlineChatDelegate = new InlineChatDelegate(
      this.webviewTextEditorInset.webview,
      this.context.extensionUri,
      this.context,
      this,
    );

    this.webviewTextEditorInset.webview.html = inlineChatDelegate.getHtmlForWebview(true);
    inlineChatDelegate.setWebviewMessageListener();
  }

  public updateWebviewTextEditorInset(textEditor?: vscode.TextEditor, text?: string) {
    this.webviewTextEditorInset?.dispose();
    this.webviewTextEditorInset = null;

    if (!textEditor || this.webviewTextEditorInset) {
      return;
    }

    this.webviewTextEditorInset = vscode.window.createWebviewTextEditorInset(
      textEditor,
      textEditor.selection.end.line,
      20,
      {
        enableScripts: true,
        localResourceRoots: [this.context.extensionUri],
      },
    );

    const inlineChatDelegate = new InlineChatDelegate(
      this.webviewTextEditorInset.webview,
      this.context.extensionUri,
      this.context,
      this,
    );

    this.webviewTextEditorInset.webview.html = inlineChatDelegate.getHtmlForWebview(false, text);
    inlineChatDelegate.setWebviewMessageListener();
  }

  public disposeWebviewTextEditorInset() {
    if (this.webviewTextEditorInset) {
      this.webviewTextEditorInset.dispose();
      this.webviewTextEditorInset = null;
    }
  }
}
