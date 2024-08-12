import { window } from 'vscode';
import { Register } from './base';

type MessageType = 'info' | 'warning' | 'error';

export interface MessageReceived {
  type: MessageType;
  text: string;
}

export default class MessageRegister extends Register<MessageReceived> {
  public messageName = 'showMessage';

  public handleContent(content: MessageReceived) {
    const { type, text } = content;
    if (type === 'info') {
      window.showInformationMessage(text);
    } else if (type === 'warning') {
      window.showWarningMessage(text);
    } else if (type === 'error') {
      window.showErrorMessage(text);
    }
  }
}
