import { Input, AutoComplete, Space, Typography, Tag } from 'antd';
import type { InputRef, SelectProps } from 'antd';
import { useEffect, useState, useRef, memo } from 'react';
import { logSubmit, logStop, isTrue, logEnableTbStarSearch } from '@/utilities/common';
import QuickOpeartion, { QuickOpHandle } from '../QuickOpeartion';
import { ChatMode } from '@/types';
import useTextEditor from '@/hooks/useTextEditor';
import { vscode } from '@/utilities/vscode';
import { StorageKey, VSCodeStorage } from '@/utilities/storage';
import BtnAreas from '@/components/ChatInputInline/btnAreas';
import './index.css';

interface ChatInputProps {
  style?: React.CSSProperties;
  disabled?: boolean;
  loading: boolean;
  inited: boolean;
  onSubmit: (submitData: {
    value: string;
    extra?: any;
    originList?: any[];
    useRTSearch?: boolean;
  }) => void;
  onStop?: () => void;
  placeholder?: string;
  showQuickQp?: boolean;
  type?: ChatMode;
  initTextAreaValue?: string;
  small: boolean;
}

const { TextArea } = Input;
const { Text } = Typography;
const ChatInput = memo((props: ChatInputProps) => {
  const {
    style,
    disabled,
    loading,
    inited,
    onSubmit,
    onStop,
    placeholder,
    showQuickQp,
    type = ChatMode.Free,
    initTextAreaValue,
    small,
  } = props || {};
  const [textAreaValue, setTextAreaValue] = useState(initTextAreaValue || '');
  const [isFocus, setIsFocus] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [showQuick, setShowQuick] = useState<boolean>(false);
  const inputRef = useRef<InputRef>(null);
  const quickOpsRef = useRef<QuickOpHandle>(null);
  // 键入结束标识
  const compositionEnd = useRef(true);
  const insertEnd = useRef<boolean>(true);
  const textEditorData = useTextEditor();
  const addedPrompt = useRef<{
    key?: string;
  }>({});

  useEffect(() => {
    if (!inputRef.current || !inited) return;

    if (!loading) {
      inputRef.current.focus();
    }
  }, [loading, inited]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const messageType = event?.data?.type; // 获取消息内容
      if (messageType === 'setInputFocus') {
        inputRef.current?.focus();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // 开始输入
  const handleCompositionStart = () => {
    compositionEnd.current = false;
  };

  // 结束输入
  const handleCompositionEnd = () => {
    compositionEnd.current = true;
  };

  const resetQuick = () => {
    setShowQuick(false);
    addedPrompt.current.key = '';
  };

  const handleSubmit = () => {
    // 输入结束才能回车请求数据
    if (!compositionEnd.current) return;
    if (showQuick && addedPrompt.current.key && quickOpsRef.current) {
      quickOpsRef.current.triggerItemClick(addedPrompt.current.key, textAreaValue);
      setTextAreaValue('');
      resetQuick();
      return;
    }

    onSubmit &&
      onSubmit({
        value: textAreaValue,
      });
    setTextAreaValue('');
    // 提问submit上报
    logSubmit({
      page: type,
      operator: 'submit',
      eventType: 'CLK',
      extData: {
        textAreaValue,
      },
    });
  };

  const handleStop = () => {
    // 停止回答
    onStop && onStop();
    // 停止回答上报
    logStop({
      page: type,
      operator: 'stop',
      eventType: 'CLK',
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.altKey) {
      e.preventDefault();
      const newText = textAreaValue + '\n';
      setTextAreaValue(newText);

      return;
    }

    if (e.key === 'Enter') {
      if (!open) {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit();
      }

      return;
    }

    if (showQuickQp) {
      if (e.key === '/' && !textAreaValue) {
        setOpen(true);
      }

      if (e.key === 'Backspace' && showQuick && textAreaValue === '\n') {
        resetQuick();
      }
    }
  };

  const handleFocus = () => {
    setIsFocus(true);

    vscode.postMessage({
      type: 'textEditor',
      content: { method: 'getSelectedText', dumb: true },
    });
  };

  const handleBlur = () => {
    // 等待一下看看有没有click事件进来
    setTimeout(() => {
      if (insertEnd.current) {
        setIsFocus(false);
      }
    }, 200);

    setOpen(false);
  };

  const handleInsert = () => {
    insertEnd.current = false;
    const { result, language, selection, filePath } = textEditorData || {};
    const { start, end } = selection || {};
    const submitText = `\`\`\`${language} ${filePath} ${start.line}-${end.line}\n${result}\n\`\`\``;
    if (textAreaValue) {
      setTextAreaValue(`${textAreaValue}\n\n ${submitText} \n\n`);
    } else {
      setTextAreaValue(`${submitText} \n\n`);
    }

    setIsFocus(false);
    insertEnd.current = true;
  };

  const handleSelect = (value: string) => {
    setOpen(false);
    addedPrompt.current.key = value;
    setShowQuick(true);
    setTextAreaValue('\n');
  };

  return (
    <div className="chat-footer" style={style}>
      <div className="chat-wrapper">
        <TextArea
          className="chat-area"
          name="chat-area"
          id="chat-area"
          autoSize={{
            minRows: 1,
            maxRows: 1,
          }}
          size={small ? 'small' : 'middle'}
          ref={inputRef}
          placeholder={placeholder || '请输入要提问的问题(option+enter换行)'}
          onKeyDown={handleKeyDown}
          onCompositionEnd={handleCompositionEnd}
          onCompositionStart={handleCompositionStart}
          onFocus={handleFocus}
          onChange={(e: any) => {
            const { target } = e || {};
            setTextAreaValue(target.value || '');
            if (!target.value) {
              setOpen(false);
            }
          }}
          onBlur={handleBlur}
        />
        <BtnAreas
          loading={loading}
          disabled={disabled}
          type={type}
          handleSubmit={handleSubmit}
          handleStop={handleStop}
        />
      </div>
    </div>
  );
});

export default ChatInput;
