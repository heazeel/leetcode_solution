import { useMemo, memo } from 'react';
import { DevMindMessage, DevMindProject } from '@/utilities/storage';
import { ChatItemType } from '@/types';
import { vscode } from '@/utilities/vscode';
import { getDataTime } from '@/utilities/common';
import { Button, Divider } from 'antd';
import useFileOperation from '../FileOperation';
import ExceptionItem from '../Exception';
import styles from './index.module.css';

export interface SchemaItemProps {
  messageData: DevMindMessage;
  isLast: boolean;
  chatData: DevMindProject;
  updateChatData: (updateData?: DevMindProject) => void;
  fileInfo: { name: string; uri: { path: string } };
  answerLoading: boolean;
  setAnswerLoading: (loading: boolean) => void;
}

const SchemaItem = memo((props: SchemaItemProps) => {
  let { messageData, isLast, chatData, updateChatData, fileInfo, setAnswerLoading } = props || {};
  const { mock, schema, executeStatus } = messageData || {};

  const code = useMemo(() => {
    return [
      { fileName: 'src/schema.json', data: schema || '', percent: 100, accept: false },
      { fileName: 'src/mock.json', data: mock || '', percent: 100, accept: false },
    ];
  }, [mock, schema]);

  const [Fileitem] = useFileOperation({
    isLast,
    messageData,
    chatData,
    updateChatData,
    code,
    fileInfo,
    showProcess: true,
    showAccept: false,
  });

  const onPreStep = () => {
    const _chatData = { ...chatData };
    _chatData.messages.pop();
    _chatData.status = 0;
    updateChatData({ ..._chatData });
  };

  const onNextStep = () => {
    const lastAskMessage = chatData.messages.filter((item) => item.type === ChatItemType.Ask).pop();
    if (lastAskMessage && lastAskMessage.content) {
      const chatAnswer: DevMindMessage = {
        type: ChatItemType.Answer,
        content: '正在生成validate代码...',
        date: getDataTime(),
        taskType: 'generate',
        target: 'validate-code',
      };

      chatData.status = 2;
      chatData.messages.push(chatAnswer);

      updateChatData();

      setAnswerLoading(true);
      const insertCodes = code.map((item) => ({
        path: `${item.fileName}`,
        text: item.data,
      }));

      vscode.postMessage({
        type: 'devMindInsertCode',
        content: {
          sessionId: chatData.sessionId,
          codes: insertCodes,
        },
      });

      const reqBody = {
        type: 'generate',
        target: 'validate-code',
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

  if (!schema || !mock) return null;

  return (
    <div className={`css-var-crow ${styles.schema_item_wrapper}`}>
      <div key={new Date(messageData.date).getTime().toString()}>{Fileitem}</div>
      <Divider className={styles.divider} />
      <div className={styles.operation_wrapper}>
        <Button style={{ marginRight: 4 }} disabled={!isLast} size="small" onClick={onPreStep}>
          上一步
        </Button>
        <Button disabled={!isLast} size="small" onClick={onNextStep}>
          下一步
        </Button>
      </div>
    </div>
  );
});

export default SchemaItem;
