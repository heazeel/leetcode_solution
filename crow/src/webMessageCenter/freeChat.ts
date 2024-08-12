import { ExtensionContext } from 'vscode';
import { MultiRegister, Register } from './base';
import { FreeChat, FreeChatRequest } from '../utilities/chat';
import { MessageDelegate } from '../utilities/message';
import { LogDecorator } from '../utilities/logger';
import { QuestionSet } from '../utilities/common';
import followUpQuestion from '../utilities/followUpQuestion';
export class SendMsgRegister extends Register<FreeChatRequest, FreeChat> {
  public messageName = 'sendFreeChatMsg';

  @LogDecorator.logCallArguments('FreeChat.SendMsgRegister')
  public handleContent(content: FreeChatRequest) {
    // lastMessageIds 剪裁，只传最后五个
    if (Array.isArray(content.lastMessageIds) && content.lastMessageIds?.length > 3) {
      content.lastMessageIds = content.lastMessageIds.slice(-3);
    }
    
    content.needAppend = false;
    const followUpQPromise: Promise<QuestionSet | null> = new Promise((resolve) => {
      const isInit = content?.type === 'initFollowUpQuestion';
      followUpQuestion.get(content.prompt, content?.history || [],  isInit).then(res => {
        if (res && res.questions) {
          return resolve(res);
        }

        resolve(null);
      }).catch((error) => {
        resolve(null);
      })
    });
  
    
    if (content?.type === 'initFollowUpQuestion') {
      followUpQPromise.then((res) => {
        if (res !== null) {
          this.delegate.postMessage('initFollowUpQuestion', {
            sessionKey: content.sessionKey,
            content: res?.questions,
          });
        }
      });
      return;
    }

    const replyPromise = this.shared!.reply(content, (data) => {
      this.delegate.postMessage(
        'freeChatResData',
        Object.assign({}, data, { sessionKey: content.sessionKey }),
      );
    })
      .then((res) => {
        const lastMsg = res?.pop();
        if (lastMsg) {
          this.delegate.postMessage('freeChatResData', {
            sessionKey: content.sessionKey,
            finishReason: 'success',
            content: lastMsg.content,
            id: lastMsg.id,
          });
        }
      })
      .catch((error) => {
        this.delegate.postMessage('freeChatResData', {
          sessionKey: content.sessionKey,
          finishReason: 'error',
          content: '请求异常',
          error,
        });
      });

    Promise.all([followUpQPromise, replyPromise]).then((res) => {
      const questionSet = res[0];
      if (questionSet !== null) {
        this.delegate.postMessage('followUpQuestion', {
          sessionKey: content.sessionKey,
          content: questionSet?.questions,
        });
      }
    });
  }
}

export class CancelChatRegister extends Register<void, FreeChat> {
  public messageName = 'cancelFreeChatMsg';

  @LogDecorator.logCallArguments('FreeChat.CancelChatRegister')
  public handleContent() {
    this.shared!.cancelCurrentChat();
  }
}

export default class FreeChatRegister extends MultiRegister<FreeChat> {
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
