import { DevMindMessage, DevMindProject } from '@/utilities/storage';
import { ChatItemType } from '@/types';
import { vscode } from '@/utilities/vscode';
import { getDataTime, logDevMind } from '@/utilities/common';
import { Button } from 'antd';
import styles from './index.module.css';

interface ExceptionItemProps {
  isLast: boolean;
  chatData: DevMindProject;
  updateChatData: (updateData?: DevMindProject) => void;
  setAnswerLoading: (loading: boolean) => void;
  fileInfo: { name: string; uri: { path: string } };
}

const ExceptionItem = (props: ExceptionItemProps) => {
  const { isLast, chatData, updateChatData, setAnswerLoading, fileInfo } = props || {};

  const onPreStep = () => {
    let status = chatData.status;
    const currentMessage = chatData.messages.pop();
    const target = currentMessage?.target;
    if (target === 'ui-code') {
      status = 2;
    } else if (target === 'validate-code') {
      status = 1;
    } else if (target === 'schema') {
      status = 0;
    }
    chatData.status = status;

    logDevMind({
      sessionId: `【${fileInfo.name}】-【${chatData.sessionId}】`,
      taskType: 'preStep',
      target: currentMessage?.target,
      executeStatus: 'success',
      content: currentMessage?.content,
      fixOpinions: currentMessage?.fixOpinions,
    });

    updateChatData();
  };

  const onRedoClick = () => {
    const lastAskMessage = chatData.messages.filter((item) => item.type === ChatItemType.Ask).pop();
    const targetMessage = chatData.messages
      .filter((item) => item.type === ChatItemType.Answer)
      .pop();

    if (lastAskMessage && lastAskMessage.content) {
      let content = '';
      if (targetMessage?.target === 'deps') {
        content = '正在重新分析依赖...';
      } else if (targetMessage?.target === 'schema') {
        content = '正在重新生成schema和mock数据...';
      } else if (targetMessage?.target === 'validate-code') {
        content = '正在重新生成validate代码...';
      } else if (targetMessage?.target === 'ui-code') {
        content = '正在重新生成ui代码...';
      }

      const chatAnswer: DevMindMessage = {
        type: ChatItemType.Answer,
        content,
        date: getDataTime(),
        taskType: targetMessage?.taskType,
        target: targetMessage?.target,
        fixOpinions: targetMessage?.fixOpinions,
      };

      chatData.messages.pop();
      chatData.messages.push(chatAnswer);
      updateChatData();

      setAnswerLoading(true);

      let reqBody: any = {
        type: targetMessage?.taskType,
        target: targetMessage?.target,
      };

      if (targetMessage?.taskType === 'fix') {
        reqBody.fixOpinions = targetMessage?.fixOpinions;
      } else {
        reqBody.requirements = lastAskMessage.content;
      }

      logDevMind({
        sessionId: `【${fileInfo.name}】-【${chatData.sessionId}】`,
        taskType: 'redo',
        target: targetMessage?.target,
        executeStatus: 'success',
        content: lastAskMessage?.content,
        fixOpinions: targetMessage?.fixOpinions,
      });

      vscode.postMessage({
        type: 'devMindSessionAsk',
        content: {
          reqBody,
          sessionId: chatData.sessionId,
        },
      });
    }
  };

  return (
    <div className={styles.exception_wrapper}>
      <Button style={{ marginRight: 4 }} disabled={!isLast} block onClick={onPreStep}>
        上一步
      </Button>
      <Button block onClick={onRedoClick}>
        重试
      </Button>
    </div>
  );
};

export default ExceptionItem;
