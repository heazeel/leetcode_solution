import { useMemo, useState } from 'react';
import { DevMindMessage, DevMindProject } from '@/utilities/storage';
import { ChatItemType } from '@/types';
import { Checkbox, Tooltip, Button, Divider, CheckboxProps } from 'antd';
import type { CheckboxGroupProps } from 'antd/lib/checkbox/Group';
import { vscode } from '@/utilities/vscode';
import { getDataTime } from '@/utilities/common';
import ExceptionItem from '../Exception';
import styles from './index.module.css';

export interface DepsItemProps {
  messageData: DevMindMessage;
  isLast: boolean;
  chatData: DevMindProject;
  updateChatData: (updateData?: DevMindProject) => void;
  answerLoading: boolean;
  setAnswerLoading: (loading: boolean) => void;
  fileInfo: { name: string; uri: { path: string } };
}

const DepsItem = (props: DepsItemProps) => {
  let { messageData, isLast, chatData, updateChatData, answerLoading, setAnswerLoading, fileInfo } =
    props || {};
  const { deps: list = [], executeStatus } = messageData || {};
  const [loading, setLoading] = useState(false);

  const checkedList = useMemo(() => {
    return list.filter((item) => item.selected).map((item) => `${item.name}#${item.package}`) || [];
  }, [list]);

  const checkAll = list.length === checkedList.length;
  const indeterminate = checkedList.length > 0 && checkedList.length < list.length;

  // 单选
  const onCheckSingleChange: CheckboxGroupProps['onChange'] = (checkedValues) => {
    const _list = list.map((item) => ({
      ...item,
      selected: checkedValues.includes(`${item.name}#${item.package}`),
    }));
    messageData.deps = _list;
    updateChatData();
  };

  // 全选
  const onCheckAllChange: CheckboxProps['onChange'] = (e) => {
    let _list = list;
    if (e.target.checked) {
      _list = list.map((item) => ({ ...item, selected: true }));
    } else {
      _list = list.map((item) => ({ ...item, selected: false }));
    }
    messageData.deps = _list;
    updateChatData();
  };

  const onNextStep = () => {
    setLoading(true);

    const depsTextArr = list.filter((item) => item.selected).map((item) => item.package);
    const singleDepsText = Array.from(new Set(depsTextArr)).join(' ');
    // 下载依赖
    vscode.postMessage({
      type: 'devMindTerminal',
      content: {
        text: `tnpm install && tnpm install ${singleDepsText}`,
      },
    });

    vscode.postMessage({
      type: 'devMindSessionTell',
      content: {
        reqBody: {
          event: 'userSelect',
          target: 'deps',
          deps: checkedList,
        },
        sessionId: chatData.sessionId,
      },
    });

    setTimeout(() => {
      console.log('generate-schema');
      setLoading(false);
      const lastAskMessage = chatData.messages
        .filter((item) => item.type === ChatItemType.Ask)
        .pop();

      if (lastAskMessage && lastAskMessage.content) {
        const chatAnswer: DevMindMessage = {
          type: ChatItemType.Answer,
          content: '正在生成schema和mock数据...',
          date: getDataTime(),
          taskType: 'generate',
          target: 'schema',
        };

        chatData.status = 1;
        chatData.messages.push(chatAnswer);
        updateChatData();

        setAnswerLoading(true);

        const reqBody = {
          type: 'generate',
          target: 'schema',
          requirements: lastAskMessage.content,
        };

        vscode.postMessage({
          type: 'devMindSessionAsk',
          content: {
            reqBody,
            sessionId: chatData.sessionId,
          },
        });
      }
    }, 2000);
  };

  if (executeStatus === 'fail') {
    if (isLast) {
      return (
        <ExceptionItem
          isLast={isLast}
          chatData={chatData}
          updateChatData={updateChatData}
          setAnswerLoading={setAnswerLoading}
          fileInfo={fileInfo}
        />
      );
    }

    return null;
  }

  if (list.length === 0) return null;

  return (
    <div className={`css-var-crow ${styles.deps_item_wrapper}`}>
      <Checkbox.Group value={checkedList} onChange={onCheckSingleChange}>
        {list.map((item) => (
          <Checkbox
            key={item.name}
            className={styles.checkbox}
            value={`${item.name}#${item.package}`}
            disabled={!isLast || answerLoading}
          >
            <Tooltip
              mouseEnterDelay={0}
              mouseLeaveDelay={0}
              title={
                <div>
                  <div className={styles.tips}>所属包: {item.package}</div>
                  {item.description}
                </div>
              }
            >
              {item.name}
            </Tooltip>
          </Checkbox>
        ))}
      </Checkbox.Group>
      <Divider className={styles.divider} />
      <div className={styles.operation_wrapper}>
        <Checkbox
          disabled={!isLast}
          indeterminate={indeterminate}
          checked={checkAll}
          onChange={onCheckAllChange}
        >
          全选
        </Checkbox>
        <Button
          disabled={!checkedList.length || !isLast}
          size="small"
          loading={loading}
          onClick={onNextStep}
        >
          下一步
        </Button>
      </div>
    </div>
  );
};

export default DepsItem;
