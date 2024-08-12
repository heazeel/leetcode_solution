import { useState, useEffect, useRef } from 'react';
import { vscode } from '@/utilities/vscode';
import ChatInput from '@/components/ChatInputInline';
import MarkDownItem from '@/components/MarkDownItem/inlineChatItem';
import { CHAT_CONTENT, ISubmitData } from '@/types';
import styles from './index.module.css';

const InlineChat = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [contentText, setContentText] = useState<string>('');
  // @ts-ignore
  const inlineChatOnlyInput = window.inlineChatOnlyInput;
  // @ts-ignore
  const inlineChatText = window.inlineChatText;

  const submitChatContent = (submitData: ISubmitData) => {
    const { value } = submitData || {};

    if (inlineChatOnlyInput) {
      vscode.postMessage({
        type: '@updateWebviewTextEditorInset',
        content: {
          prompt: value,
        },
      });
      return;
    }

    setLoading(true);

    vscode.postMessage({
      type: 'sendInlineChatMsg',
      content: {
        prompt: value,
      },
    });
  };

  const stopAnswer = () => {
    vscode.postMessage({
      type: 'cancelInlineChatMsg',
    });

    setLoading(false);
  };

  const getChatRes = (data: CHAT_CONTENT) => {
    const { id, content, finishReason, error } = data || {};
    if (content === undefined && !finishReason) return;

    let _content = content;

    if (finishReason) {
      // 当前回复结束
      setLoading(false);

      // 接口错误时，无id返回，手动设置错误id
      if (finishReason === 'error' && error && error.code && error.code !== 'ERR_CANCELED') {
        const { message = '接口超时，请重试～' } = error || {};
        _content = `${content}: ${message}`;
      }
    }

    setContentText(_content);
  };

  useEffect(() => {
    if (inlineChatText) {
      submitChatContent({ value: inlineChatText });
    }

    const handleMessage = (event: any) => {
      const message = event.data;
      const { type, content } = message || {};
      if (type === 'InlineChatResData') {
        getChatRes(content);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <div
      className={`css-var-crow ${styles.inline_chat} ${inlineChatOnlyInput ? styles.inline_chat_only_input : ''}`}
    >
      <ChatInput
        style={{ padding: 0 }}
        loading={loading}
        inited={true}
        onSubmit={submitChatContent}
        onStop={stopAnswer}
        showQuickQp={false}
        initTextAreaValue={inlineChatText}
        small={inlineChatOnlyInput}
      />
      {!inlineChatOnlyInput && (
        <div className={styles.inline_chat_content}>
          <MarkDownItem content={contentText} />
        </div>
      )}
    </div>
  );
};

export default InlineChat;
