import { Mentions, Tag } from 'antd';
import { useEffect, useState, useRef, memo, useMemo } from 'react';
import { logSubmit, logStop, logMentions } from '@/utilities/common';
import QuickOpeartion, { QuickOpHandle } from '../QuickOpeartion';
import { ChatMode, TBStartMode } from '@/types';
import useTextEditor from '@/hooks/useTextEditor';
import { vscode } from '@/utilities/vscode';
import { StorageKey, VSCodeStorage, ChatMessage } from '@/utilities/storage';
import { MentionsRef } from 'antd/es/mentions';
import BtnAreas from './btnAreas';
import { MentionsDelegate } from '@/utilities/mentions';
import Marquee from '../Marquee';
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
    resDataType?: string;
    prefix?: string[];
  }) => void;
  onStop?: () => void;
  placeholder?: string;
  showQuickQp?: boolean;
  type?: ChatMode;
  sessionKey: string;
  getAskItem: (position: 'pre' | 'next', id?: string) => ChatMessage | undefined | '';
}

interface IMentionProps {
  value: string;
  name: string;
  type: string;
  parent?: string;
  children?: IMentionProps[];
  label: React.ReactNode;
}

const ChatInput = memo((props: ChatInputProps) => {
  const {
    disabled,
    loading,
    inited,
    onSubmit,
    onStop,
    placeholder,
    showQuickQp,
    sessionKey,
    type = ChatMode.Free,
    getAskItem,
  } = props || {};
  const [textAreaValue, setTextAreaValue] = useState('');
  const [showPrefixOptions, setShowPrefixOptions] = useState<boolean>(true);
  const [open, setOpen] = useState<boolean>(false);
  const [showPlaceholder, setShowPlacehoder] = useState<boolean>(true);
  const [mentions, setMentions] = useState<IMentionProps[]>([]);
  const [mentionPrefix, setMentionPrefix] = useState('');
  const [isFocus, setIsFocus] = useState<boolean>(false);
  const [showMentions, setShowMentions] = useState<boolean>(false);
  const [reducePanel, setReducePanel] = useState<boolean>(false);
  const inputRef = useRef<MentionsRef>(null);
  const quickOpsRef = useRef<QuickOpHandle>(null);

  const switchAskId = useRef('');
  const canUseArrowSwitch = useRef<boolean>(true); // 能否使用箭头回溯历史问题

  // 键入结束标识
  const compositionEnd = useRef(true);
  const insertEnd = useRef<boolean>(true);
  const textEditorData = useTextEditor();
  const promptOp: any = VSCodeStorage.getItem(StorageKey.PromptStore) || [];

  // 触发关键字
  const mentionOptions = useMemo(() => {
    const mentionsDelegate = new MentionsDelegate(mentions, reducePanel);
    const options = mentionsDelegate.getMentions();
    return options[mentionPrefix] || [];
  }, [promptOp, mentions, mentionPrefix, reducePanel]);

  const handlePrefix = useMemo(() => {
    if (mentions.length > 1 || !showPrefixOptions) return [];
    const mentionsDelegate = new MentionsDelegate(mentions);
    const keys = ['/', ...Object.keys(mentionsDelegate.mentionObj)];
    return keys;
  }, [mentions, showPrefixOptions]);

  const disabledInput = useMemo(() => {
    return disabled || loading || !inited;
  }, [disabled, loading, inited]);

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

  useEffect(() => {
    setShowPlacehoder(textAreaValue === '');
  }, [textAreaValue]);

  // 开始输入
  const handleCompositionStart = () => {
    compositionEnd.current = false;
  };

  // 结束输入
  const handleCompositionEnd = () => {
    compositionEnd.current = true;
  };

  const resetShowMentions = () => {
    setShowMentions(false);
    setMentions([]);
  };

  const handleSubmit = () => {
    // 输入结束才能回车请求数据
    if (!compositionEnd.current) return;
    const prefix = mentions?.map((item) => item.name) || [];
    const mention = mentions[0] || {};
    if (showMentions) {
      logMentions({
        page: type,
        operator: 'submit',
        eventType: 'CLK',
        extData: {
          type: mention?.type || '',
          value: textAreaValue,
          prefix: prefix.join(','),
        },
      });
    }
    if (showMentions && mention?.type === 'quickOp' && mention?.name && quickOpsRef.current) {
      quickOpsRef.current.triggerItemClick(mention?.name, textAreaValue);
      setTextAreaValue('');
      resetShowMentions();
      return;
    }

    const isRealTimeSearch = mention?.type === 'RealTimeSearch';
    const mentionType = mention?.type || '';

    if (showMentions) {
      // 私域答疑
      if (mentionType === 'DeveloperAssistant') {
        setTextAreaValue('\n');
        onSubmit &&
          onSubmit({
            value: textAreaValue,
            resDataType: mentionType,
            prefix,
          });
      } else if (mentionType === 'RealTimeSearch') {
        // 实时搜索
        const mode = (mentions[1] && mentions[1]?.value) || TBStartMode.Group;
        vscode.postMessage({
          type: 'dealTbstarMsg',
          content: { type: 'setMode', mode },
        });
        setTextAreaValue('\n');
        onSubmit &&
          onSubmit({
            value: textAreaValue,
            useRTSearch: isRealTimeSearch,
            resDataType: mentionType,
            prefix,
          });
      }
    } else {
      onSubmit &&
        onSubmit({
          value: textAreaValue,
          useRTSearch: isRealTimeSearch,
          resDataType: mentionType,
          prefix,
        });

      if (mentions.length) {
        resetShowMentions();
      }
      setTextAreaValue('');
    }

    // 提问submit上报
    logSubmit({
      page: type,
      operator: 'submit',
      eventType: 'CLK',
      extData: {
        textAreaValue,
      },
    });

    canUseArrowSwitch.current = true;
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

  const handleKeyDown = (e: any) => {
    const { target = {} } = e || {};

    if (canUseArrowSwitch.current) {
      const dealSwitch = (position: 'pre' | 'next') => {
        let askItem;
        if (switchAskId.current) {
          askItem = getAskItem(position, switchAskId.current);
        } else {
          askItem = getAskItem(position);
        }

        if (askItem !== undefined) {
          if (!askItem) {
            switchAskId.current = '';
            setTextAreaValue('');
            return;
          }
          switchAskId.current = askItem.id;
          setTextAreaValue(askItem.content);
        }
      };

      if (e.key === 'ArrowUp') {
        if (target.selectionStart === 0 && target.selectionEnd === 0) {
          dealSwitch('pre');
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        const textLength = target.value.length;
        if (target.selectionStart === textLength && target.selectionEnd === textLength) {
          dealSwitch('next');
        }
        return;
      }
    }

    if (e.key === 'Enter' && e.altKey) {
      e.preventDefault();
      const { selectionStart, selectionEnd } = target;
      const newValue =
        textAreaValue.substring(0, selectionStart) + '\n' + textAreaValue.substring(selectionEnd);
      setTextAreaValue(newValue);
      const timeout = setTimeout(() => {
        clearTimeout(timeout);
        target.setSelectionRange(selectionStart + 1, selectionStart + 1);
      });
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

    if (e.key === 'Backspace' && !disabledInput) {
      if (textAreaValue === '') {
        resetShowMentions();
        return;
      }
      if (showMentions && textAreaValue === '\n') {
        if (mentions.length > 1) {
          const newMentions = mentions.slice(0, mentions.length - 1);
          setMentions([...newMentions]);
          const timeout = setTimeout(() => {
            clearTimeout(timeout);
            setTextAreaValue('\n');
          });
        } else {
          resetShowMentions();
        }
      }
      return;
    }
  };

  const handleFocus = () => {
    setIsFocus(true);

    vscode.postMessage({
      type: 'textEditor',
      content: { method: 'getSelectedText', dumb: true },
    });
  };

  const handleSelect = (value: any, prefix: string) => {
    setOpen(false);
    if (prefix) {
      setShowMentions(true);
      setTextAreaValue('\n');
      let newMentions: IMentionProps[] = [];
      const { parent, prefix } = value;
      if (parent) {
        const mentionsDelegate = new MentionsDelegate(mentions);

        const mentionsObj = mentionsDelegate.mentionObj;
        const prefixMentions = mentionsObj[prefix];
        const mentionItem = prefixMentions.find((item) => {
          return item.value === parent;
        });
        if (mentionItem) {
          newMentions = [mentionItem, value];
          setMentions(newMentions);
          return;
        }
      }
      if (mentions.length) {
        newMentions = [...mentions, value];
        setMentions(newMentions);
      } else {
        newMentions = [value];
        setMentions(newMentions);
      }
    }
  };

  const handleSearch = (value: string, newPrefix: string) => {
    if (newPrefix) {
      console.log(value);
      setOpen(true);
    }
    if (mentionPrefix !== newPrefix) setMentionPrefix(newPrefix);
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

  const placeholderClick = () => {
    if (inputRef.current) inputRef.current.focus();
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

  const needShowAdd = Boolean(
    !loading && isFocus && textEditorData.method === 'getSelectedText' && textEditorData.result,
  );

  return (
    <div className="chat-footer">
      {showQuickQp ? (
        <QuickOpeartion
          sessionKey={sessionKey}
          ref={quickOpsRef}
          type={type}
          disabled={loading}
          onSubmit={onSubmit}
        />
      ) : null}
      <div className="chat-wrapper">
        {showPlaceholder && (
          <Marquee
            className="mention-placeholder"
            onContainerClick={placeholderClick}
            data={[
              "可以使用 / or @ 体验解锁更多插件能力",
              "使用 option + enter 换行",
              "使用 ⬆️ 或 ⬇️ 箭头可以回溯历史问题"
            ]}
            itemHeight={32}
          />
        )}
        <div className="chat-wrapper-mentions">
          <div className="mention-tags">
            {mentions.map((item: IMentionProps) => {
              return (
                <Tag
                  bordered={!disabledInput}
                  style={{ opacity: disabledInput ? 0.3 : 1 }}
                  key={item.name}
                >
                  {item.name}
                </Tag>
              );
            })}
          </div>
          <Mentions
            className="chat-area-mentions"
            name="chat-area"
            id="chat-area"
            placement="top"
            autoSize={{
              minRows: 1,
              maxRows: 8,
            }}
            ref={inputRef}
            // placeholder={placeholder || '请输入要提问的问题(option+enter换行)'}
            onKeyDown={handleKeyDown}
            onCompositionEnd={handleCompositionEnd}
            onCompositionStart={handleCompositionStart}
            onFocus={handleFocus}
            value={textAreaValue}
            disabled={disabledInput}
            readOnly={disabledInput}
            onChange={(value: string) => {
              const textValue = value.replace(/\n/g, '');
              let reg = /^(?:\/|@)?[a-zA-Z0-9_]*$/;
              if (textValue === '' || !reg.test(textValue)) {
                setShowPrefixOptions(false);
              } else {
                setShowPrefixOptions(true);
              }
              if (!value) {
                setOpen(false);
                canUseArrowSwitch.current = true;
              } else {
                canUseArrowSwitch.current = false;
              }
              switchAskId.current = '';
              setTextAreaValue(value || '');
            }}
            onSelect={handleSelect}
            onBlur={handleBlur}
            onSearch={handleSearch}
            options={mentionOptions}
            prefix={handlePrefix}
            onResize={(e) => setReducePanel(e.width < 320)}
          />
        </div>

        <BtnAreas
          loading={loading}
          disabled={disabled}
          type={type}
          handleSubmit={handleSubmit}
          handleStop={handleStop}
          needShowAdd={needShowAdd}
          handleInsert={handleInsert}
        />
      </div>
    </div>
  );
});

export default ChatInput;
