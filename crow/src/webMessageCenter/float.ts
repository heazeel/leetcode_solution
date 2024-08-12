import { commands } from 'vscode';
import { Register } from './base';

type MessageType = 'userManual' | 'feedback';

export interface CallParameter {
  type: MessageType;
}

export default class FloatOperationRegister extends Register<CallParameter> {
  public messageName = 'floatOperation';

  public handleContent(content: CallParameter) {
    const { type } = content;
    // 用户手册
    if (type === 'userManual') {
      commands.executeCommand('crowCopilot.openUserManual');
      // 用户反馈
    } else if (type === 'feedback') {
    }
  }
}
