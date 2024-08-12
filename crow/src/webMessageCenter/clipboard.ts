import { window, env } from 'vscode';
import { Register } from './base';

type Method = 'writeText' | 'readText';

export interface CallParameter {
  method: Method;
  text?: string;
}

export default class ClipboardRegister extends Register<CallParameter> {
  public messageName = 'clipboard';

  public handleContent(content: CallParameter) {
    const { method, text } = content;
    if (method === 'writeText' && text) {
      env.clipboard.writeText(text).then(() => {
        window.showInformationMessage('已经复制到剪切板');
      });
    } else if (method === 'readText') {
      env.clipboard.readText().then((text) => {
        this.delegate.postMessage('clipboard', { method, result: text });
      });
    }
  }
}
