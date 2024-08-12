import { Disposable } from 'vscode';

/**
 * WebViewDelegate 的抽象类，需要实现 getHtmlForWebview 和 setWebviewMessageListener 方法。
 */
export default abstract class WebViewDelegate {
  public abstract getHtmlForWebview(): string;

  public abstract setWebviewMessageListener(
    thisArgs?: any,
    disposables?: Disposable[],
  ): void;
}
