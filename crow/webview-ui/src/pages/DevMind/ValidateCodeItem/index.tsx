import { useState } from 'react';
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

const ValidateCodeItem = (props: SchemaItemProps) => {
  let { messageData, isLast, chatData, updateChatData, fileInfo, answerLoading, setAnswerLoading } =
    props || {};
  const { code, executeStatus } = messageData || {};
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [Fileitem, onSubmitUpdate] = useFileOperation({
    isLast,
    messageData,
    chatData,
    updateChatData,
    code,
    fileInfo,
    editting: isEdit,
    showProcess: true,
    showAccept: false,
    setAnswerLoading,
  });

  const btnDisabled = !isLast || answerLoading;

  const onPreStep = () => {
    const _chatData = { ...chatData };
    _chatData.status = 1;
    _chatData.messages.pop();
    updateChatData({ ..._chatData });
  };

  const onAccept = () => {
    setLoading(true);
    vscode.postMessage({
      type: 'devMindSessionTell',
      content: {
        reqBody: {
          event: 'userSelect',
          target: 'code',
          codes: code?.map((item) => ({ filename: item.fileName, content: item.data })) || [],
        },
        sessionId: chatData.sessionId,
      },
    });

    setTimeout(() => {
      setLoading(false);
      const lastAskMessage = chatData.messages
        .filter((item) => item.type === ChatItemType.Ask)
        .pop();

      if (lastAskMessage && lastAskMessage.content) {
        const chatAnswer: DevMindMessage = {
          type: ChatItemType.Answer,
          content: '正在生成ui代码...',
          date: getDataTime(),
          taskType: 'generate',
          target: 'ui-code',
        };

        chatData.messages.push(chatAnswer);
        updateChatData();

        setAnswerLoading(true);

        const reqBody = {
          type: 'generate',
          target: 'ui-code',
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
    }, 3000);
  };

  const onEditClick = () => {
    setIsEdit(!isEdit);
  };

  const onUpdate = () => {
    setIsEdit(false);
    onSubmitUpdate();
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

  return (
    <div className={`css-var-crow ${styles.schema_item_wrapper}`}>
      {Fileitem}
      <Divider className={styles.divider} />
      <div className={styles.operation_wrapper}>
        <Button
          disabled={btnDisabled || loading || !code?.length}
          size="small"
          onClick={onEditClick}
          type={isEdit ? 'primary' : 'default'}
        >
          {isEdit ? '取消修改' : '修改文件'}
        </Button>
        {!isEdit && (
          <div>
            <Button
              style={{ marginRight: 4 }}
              disabled={btnDisabled || loading}
              size="small"
              onClick={onPreStep}
            >
              上一步
            </Button>
            <Button
              disabled={btnDisabled || !code?.length}
              size="small"
              loading={loading}
              onClick={onAccept}
            >
              下一步
            </Button>
          </div>
        )}
        {isEdit && (
          <Button disabled={btnDisabled || loading} size="small" onClick={onUpdate}>
            提交修改
          </Button>
        )}
      </div>
    </div>
  );
};

export default ValidateCodeItem;
