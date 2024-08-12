import { ExtensionContext } from 'vscode';
import { MultiRegister, Register } from './base';
import { FreeChat, FreeChatRequest } from '../utilities/chat';
import { MessageDelegate } from '../utilities/message';
import { LogDecorator } from '../utilities/logger';

export class SendMsgRegister extends Register<FreeChatRequest, FreeChat> {
  public messageName = 'sendInlineChatMsg';

  @LogDecorator.logCallArguments('InlineChat.SendMsgRegister')
  public handleContent(content: FreeChatRequest) {
    content.needAppend = false;
    this.shared!.reply(content, (data) => {
      this.delegate.postMessage('InlineChatResData', data);
    })
      .then((res) => {
        const lastMsg = res?.pop();
        if (lastMsg) {
          this.delegate.postMessage('InlineChatResData', {
            finishReason: 'success',
            content: lastMsg.content,
            id: lastMsg.id,
          });
        }
      })
      .catch((error) => {
        this.delegate.postMessage('InlineChatResData', {
          finishReason: 'error',
          content: '请求异常',
          error,
        });
      });
  }
}

export class PreChatConditionRegister extends Register<void, FreeChat> {
  public messageName = 'preChatConditionMsg';
  @LogDecorator.logCallArguments('InlineChat.PreChatConditionMsg')
  public handleContent() {
    this.shared!.cancelCurrentChat();
  }
}

export class CancelChatRegister extends Register<void, FreeChat> {
  public messageName = 'cancelInlineChatMsg';

  @LogDecorator.logCallArguments('InlineChat.CancelChatRegister')
  public handleContent() {
    this.shared!.cancelCurrentChat();
  }
}

export default class InlineChatRegister extends MultiRegister<FreeChat> {
  private registers: Register[];

  constructor(readonly delegate: MessageDelegate, readonly context: ExtensionContext) {
    super(delegate, context);
    this.registers = [
      new SendMsgRegister(delegate, context),
      new CancelChatRegister(delegate, context),
    ];
  }

  public register(shared: any) {
    this.registers.forEach((r) => r.register(shared));
  }
}
