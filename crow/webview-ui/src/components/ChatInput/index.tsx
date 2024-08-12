import { Input, AutoComplete, Space, Typography, Tag } from 'antd';
import type { InputRef, SelectProps } from 'antd';
import { useEffect, useState, useRef, memo } from 'react';
import { logSubmit, logStop, isTrue, logEnableTbStarSearch } from '@/utilities/common';
import QuickOpeartion, { QuickOpHandle } from '../QuickOpeartion';
import { ChatMode } from '@/types';
import useTextEditor from '@/hooks/useTextEditor';
import { vscode } from '@/utilities/vscode';
import { StorageKey, VSCodeStorage } from '@/utilities/storage';
import BtnAreas from '@/components/ChatInput/btnAreas';
import './index.css';

interface ChatInputProps {
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
}

const { TextArea } = Input;
const { Text } = Typography;
const ChatInput = memo((props: ChatInputProps) => {
  const {
    disabled,
    loading,
    inited,
    onSubmit,
    onStop,
    placeholder,
    showQuickQp,
    type = ChatMode.Free,
  } = props || {};
  const [textAreaValue, setTextAreaValue] = useState('');
  const [isFocus, setIsFocus] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [showQuick, setShowQuick] = useState<boolean>(false);
  const [openRealTimeSearch, setOpenRealTimeSearch] = useState<boolean>(
    isTrue(VSCodeStorage.getItem(StorageKey.OpenRealtimeSearch)),
  );
  const inputRef = useRef<InputRef>(null);
  const quickOpsRef = useRef<QuickOpHandle>(null);
  // 键入结束标识
  const compositionEnd = useRef(true);
  const insertEnd = useRef<boolean>(true);
  const textEditorData = useTextEditor();
  const addedPrompt = useRef<{
    key?: string;
  }>({});

  const promptOp: any = VSCodeStorage.getItem(StorageKey.PromptStore) || [];
  const allOptions: SelectProps<object>['options'] = promptOp.map((item: any) => {
    return {
      value: item.name,
      label: (
        <Space direction="vertical" size={5}>
          <Text>{item.name}</Text>
          <Text type="secondary">{item.description}</Text>
        </Space>
      ),
    };
  });

  const [options, setOptions] = useState<SelectProps<object>['options']>(allOptions);

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
        useRTSearch: openRealTimeSearch,
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

    if (showQuickQp && !openRealTimeSearch) {
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

  const handleSearch = (value: string) => {
    const newOptions = allOptions?.filter((item: any) => {
      return item.value && String(item.value).includes(value);
    });

    if (newOptions?.length) {
      setOptions(newOptions);
    } else {
      setOptions([]);
    }
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

  const handleQuickClick = () => {
    setOptions(allOptions);
    setOpen(true);
  };

  const handleRC = () => {
    if (loading) {
      return;
    }

    const value = openRealTimeSearch ? '0' : '1';
    logEnableTbStarSearch({
      page: type,
      operator: value === '0' ? '关闭实时搜索' : '开启实时搜索',
      eventType: 'CLK',
      extData: {
        value,
      },
    });
    VSCodeStorage.setItem(StorageKey.OpenRealtimeSearch, value);
    if (value === '0') {
      VSCodeStorage.setItem(StorageKey.RealtimeSearchSession, '');
    }

    setOpenRealTimeSearch(!openRealTimeSearch);
  };

  const needShowAdd = Boolean(
    !loading && isFocus && textEditorData.method === 'getSelectedText' && textEditorData.result,
  );

  return (
    <div className="chat-footer">
      {showQuickQp ? (
        <QuickOpeartion
          ref={quickOpsRef}
          type={type}
          disabled={loading || openRealTimeSearch}
          sessionKey="main"
          onSubmit={onSubmit}
        />
      ) : null}
      <div className="chat-wrapper">
        <AutoComplete
          options={options}
          style={{
            width: '100%',
            height: 'auto',
          }}
          open={open}
          disabled={disabled || loading || !inited}
          value={textAreaValue}
          onSearch={handleSearch}
          onSelect={handleSelect}
        >
          <TextArea
            className="chat-area"
            name="chat-area"
            id="chat-area"
            autoSize={{
              minRows: type === ChatMode.DevMind ? 1 : 2,
              maxRows: 8,
            }}
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
        </AutoComplete>

        {showQuickQp && showQuick ? (
          <div className="chat-quick-btn" onClick={handleQuickClick}>
            <Tag>{addedPrompt.current.key}</Tag>
          </div>
        ) : null}

        <BtnAreas
          loading={loading}
          disabled={disabled}
          type={type}
          openRealTimeSearch={openRealTimeSearch}
          handleSubmit={handleSubmit}
          handleStop={handleStop}
          handleRC={handleRC}
          needShowAdd={needShowAdd}
          showQuick={showQuick}
          handleInsert={handleInsert}
        />
      </div>
    </div>
  );
});

export default ChatInput;
