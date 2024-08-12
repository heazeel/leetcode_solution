import { memo, useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Button, Dropdown, Typography, Space, message } from 'antd';
import type { MenuProps } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { QuickOpeartionType, ChatMode } from '@/types';
import { vscode } from '@/utilities/vscode';
import { StorageKey, VSCodeStorage } from '@/utilities/storage';
import { logPrompt, logCustomPrompt, logSyncPromptFactory } from '@/utilities/common';
import ConfigModal from './configModal';
import OpBtn from './opBtn';
import './index.css';

const { Text } = Typography;

const CodeTag = '{codeStr}';

type QuickOpeartionProps = {
  quickOps?: QuickOpeartionType[];
  type?: ChatMode;
  disabled?: boolean;
  loading?: boolean;
  onSubmit: (sbumitData: { value: string; extra?: any; originList?: any[] }) => void;
  sessionKey: string;
};

export interface QuickOpHandle {
  triggerItemClick: (key: string, inputValue: string) => void;
}

const QuickOpeartion = forwardRef<QuickOpHandle, QuickOpeartionProps>((props, ref) => {
  const { disabled, onSubmit, type = ChatMode.Free, sessionKey } = props;
  const [promptOp, setPromptOp] = useState<any>(
    VSCodeStorage.getItem(StorageKey.PromptStore) || [],
  );
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const operationRef = useRef<{ name?: string; template?: string; inputValue?: string }>();

  useImperativeHandle(ref, () => ({
    triggerItemClick: (key, inputValue) => {
      const item = promptOp?.filter((item: any) => {
        return item.name == key;
      })[0];

      if (item) {
        handleBtnClick(item, inputValue);
      }
    },
  }));

  const handleBtnClick = (item: any, inputValue?: string) => {
    const { name, template, key, isBuiltin } = item || {};
    operationRef.current = { name, template, inputValue };

    if (isBuiltin) {
      const params = {
        __inputValue: inputValue,
      };

      vscode.postMessage({
        type: 'shortcut',
        content: { method: 'getFormatPrompt', key, params },
      });
    } else {
      vscode.postMessage({
        type: 'textEditor',
        content: { method: 'getSelectedText', operation: name },
      });
    }

    // 埋点上报
    logPrompt({
      page: type,
      operator: key,
      eventType: 'CLK',
      extData: {
        ...item,
      },
    });
  };

  const renderBtns = () => {
    return (
      <>
        {promptOp.map((item: any, index: number) => {
          return (
            <OpBtn
              key={index}
              item={item}
              onClick={handleBtnClick}
              disabled={disabled}
              promptOp={promptOp}
              setPromptOp={setPromptOp}
              isConfiging={modalVisible}
            />
          );
        })}
      </>
    );
  };

  const menuItems: MenuProps['items'] = useMemo(() => {
    const items: MenuProps['items'] = [];
    promptOp.forEach((item: any) => {
      if (!item.show) {
        items.push({
          key: item.key,
          label: (
            <Space direction="vertical" size={5}>
              <Text>{item.name}</Text>
              <Text type="secondary">{item.description}</Text>
            </Space>
          ),
        });
      }
    });

    return items;
  }, [promptOp]);

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    const { key } = e;
    const target = promptOp.find((item: any) => item.key === key);
    const { name, template, isBuiltin } = target || {};

    operationRef.current = { name, template };

    if (isBuiltin) {
      vscode.postMessage({
        type: 'shortcut',
        content: { method: 'getFormatPrompt', key },
      });
    } else {
      vscode.postMessage({
        type: 'textEditor',
        content: { method: 'getSelectedText', operation: name },
      });
    }

    //  埋点上报
    logPrompt({
      page: type,
      operator: key,
      eventType: 'CLK',
      extData: {
        ...target,
      },
    });
  };

  const handleTextEditorMsg = (event: any) => {
    const message = event.data;
    const { type, content } = message || {};
    if (type === 'getPromptFromFactorySuccess') {
      const { list = [] } = content;
      const filterInitList: typeof promptOp = [];
      promptOp.map((item: any) => {
        const { isFactory = false } = item || {};
        if (!isFactory) {
          filterInitList.push(item);
        }
        if (isFactory) {
          const listItem = list.find((i: any) => i.name === item.name);
          if (listItem) {
            filterInitList.push(listItem);
          }
        }
      });
      const filterList = list.filter((item: any) => {
        return promptOp.findIndex((i: any) => i.key === item.key) === -1;
      });
      const newList = [...filterInitList, ...filterList];
      setPromptOp([...newList]);
      VSCodeStorage.setItem(StorageKey.PromptStore, newList);
    }

    let submitText = '';
    if (message && message.type === 'getCodeLenFormatPromptSuccess') {
      const content = message.content;
      const { prompt, promptKey, showText } = content || {};
      if (prompt) {
        const data = VSCodeStorage.getItem(StorageKey.FreeChatStore);
        const sessionData = data && data[sessionKey];

        onSubmit({
          value: showText,
          extra: { promptKey: `/${promptKey}`, prompt },
          originList: sessionData?.messages,
        });
      }
      return;
    }
    if (operationRef.current?.name) {
      if (message && message.type === 'textEditor') {
        const { name = '', template = '', inputValue } = operationRef.current || {};
        const content = message.content;

        if ((!content || !content.result) && !inputValue) {
          // Msg.error('未在右侧编辑区选择内容');
          vscode.postMessage({
            type: 'showMessage',
            content: { type: 'error', text: '未在右侧编辑区选择内容' },
          });

          return;
        }

        if (content.method === 'getSelectedText') {
          const { result, language, selection, filePath } = content || {};
          const { start, end } = selection || {};
          submitText = `\`\`\`${language} ${filePath} ${start.line}-${end.line}\n${result}\n\`\`\``;
        }

        if (inputValue) {
          submitText += `\n ${inputValue}`;
        }

        if (submitText) {
          const hasCodeTag = template.includes(CodeTag);
          let prompt = '';
          if (hasCodeTag) {
            prompt = template.replace(new RegExp(CodeTag, 'g'), submitText);
          }

          // TODO：把originList传一下，不传原本的数据会消失，后续找一下原因
          const data = VSCodeStorage.getItem(StorageKey.FreeChatStore);
          const sessionData = data && data[sessionKey];

          onSubmit({
            value: submitText,
            extra: { template, promptKey: name, prompt },
            originList: sessionData?.messages,
          });
        }
      } else if (message && message.type === 'getFormatPromptSuccess') {
        const content = message.content;
        const { prompt, promptKey, showText } = content || {};
        if (prompt) {
          const data = VSCodeStorage.getItem(StorageKey.FreeChatStore);
          const sessionData = data && data[sessionKey];

          onSubmit({
            value: showText,
            extra: { promptKey: `/${promptKey}`, prompt },
            originList: sessionData?.messages,
          });
        }
      }
    }

    // 清空处理态
    operationRef.current = {};
  };

  // 获取prompt工厂
  const getPromptFactory = () => {
    message.success('同步prompt工厂请求发送成功');
    vscode.postMessage({ type: 'shortcut', content: { method: 'getPromptFromFactory' } });
    // 同步prompt工厂上报
    logSyncPromptFactory({
      page: type,
      operator: 'syncPromptFactory',
      eventType: 'CLK',
    });
  };

  useEffect(() => {
    vscode.postMessage({ type: 'shortcut', content: { method: 'getPromptFromFactory' } });
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleTextEditorMsg);

    return () => {
      window.removeEventListener('message', handleTextEditorMsg);
    };
  }, []);

  return (
    <div className="chaoshi-quick-ops-con">
      <div className="chat-quick-ops-wrapper">
        <Button
          size="small"
          icon={<SettingOutlined />}
          onClick={() => {
            setModalVisible(true);
            logCustomPrompt({
              page: type,
              operator: 'openSetting',
              eventType: 'CLK',
            });
          }}
          disabled={disabled}
          style={{ marginRight: 8 }}
        />
        <div className="chat-quick-ops">{renderBtns()}</div>
      </div>
      {!!menuItems.length && (
        <Dropdown
          placement="topRight"
          menu={{
            items: menuItems,
            onClick: handleMenuClick,
          }}
          trigger={['click']}
          disabled={disabled}
          overlayStyle={{ maxHeight: '60vh', overflow: 'auto' }}
        >
          <Button size="small">更多</Button>
        </Dropdown>
      )}
      <ConfigModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
        }}
        type={type}
        promptOp={promptOp}
        setPromptOp={setPromptOp}
        getPromptFactory={getPromptFactory}
      />
    </div>
  );
});

export default memo(QuickOpeartion);
