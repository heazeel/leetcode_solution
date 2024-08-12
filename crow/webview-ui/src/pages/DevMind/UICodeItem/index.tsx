import { useState, useMemo, memo } from 'react';
import { DevMindMessage, DevMindProject, DevMindStorage } from '@/utilities/storage';
import { Button, Divider, Typography } from 'antd';
import { logDevMind } from '@/utilities/common';
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
  init: () => void;
}

const UICodeItem = memo((props: SchemaItemProps) => {
  let {
    messageData,
    isLast,
    chatData,
    updateChatData,
    fileInfo,
    answerLoading,
    setAnswerLoading,
    init,
  } = props || {};
  const { code, executeStatus } = messageData || {};
  const [isEdit, setIsEdit] = useState(false);
  const [Fileitem, onSubmitUpdate, onAcceptFile] = useFileOperation({
    isLast,
    messageData,
    chatData,
    updateChatData,
    code,
    fileInfo,
    editting: isEdit,
    showProcess: true,
    setAnswerLoading,
  });

  const btnDisabled = !isLast || answerLoading || chatData.status === 3 || !code?.length;

  const onPreStep = () => {
    const _chatData = { ...chatData };
    _chatData.status = 2;
    _chatData.messages.pop();
    updateChatData({ ..._chatData });
  };

  const onEditClick = () => {
    setIsEdit(!isEdit);
  };

  const onUpdate = () => {
    setIsEdit(false);
    onSubmitUpdate();
  };

  const reStart = () => {
    logDevMind({
      sessionId: `【${fileInfo.name}】-【${chatData.sessionId}】`,
      taskType: 'reStart',
      executeStatus: 'success',
    });

    DevMindStorage.clearStorage();
    init();
  };

  const hasAcceptedAll = useMemo(() => {
    return code?.every((item) => item.accept);
  }, [code]);

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
    <>
      <div className={`css-var-crow ${styles.schema_item_wrapper}`}>
        {Fileitem}
        <Divider className={styles.divider} />
        <div className={styles.operation_wrapper}>
          <Button
            disabled={btnDisabled || hasAcceptedAll}
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
                disabled={!isLast || answerLoading || chatData.status === 3 || hasAcceptedAll}
                size="small"
                onClick={onPreStep}
              >
                上一步
              </Button>
              <Button
                disabled={btnDisabled || hasAcceptedAll}
                size="small"
                onClick={() => onAcceptFile(code)}
              >
                {hasAcceptedAll ? '已采纳' : '一键采纳'}
              </Button>
            </div>
          )}
          {isEdit && (
            <Button disabled={!isLast || answerLoading} size="small" onClick={onUpdate}>
              提交修改
            </Button>
          )}
        </div>
      </div>
      {!answerLoading &&
        isLast &&
        executeStatus === 'success' &&
        code?.every((item) => item.accept) && (
          <div className={`css-var-crow`}>
            <Divider className={styles.ending_divider} />
            <div className={styles.ending_wrapper}>
              <Typography.Title level={4}>Congratulations！🎉🎉🎉</Typography.Title>
              <Typography.Paragraph>
                根据您的描述，已经为您生成了全部的代码。
                <br />
                您可以检验代码，或者选择重新开始
              </Typography.Paragraph>
              <Button onClick={reStart} disabled={!isLast}>
                重新开始
              </Button>
            </div>
          </div>
        )}
    </>
  );
});

export default UICodeItem;
