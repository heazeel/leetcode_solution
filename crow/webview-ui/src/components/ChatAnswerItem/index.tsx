import { memo } from 'react';
import { CopyOutlined, RedoOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Typography, Divider, Tooltip } from 'antd';
import { CROW_ICON } from '../../constant';
import MarkDownItem from '../MarkDownItem';
import TbStarAnswer from '../TbStarAnswer';
import FollowUpQuestion from '../FollowUpQuestion';
import { vscode } from '@/utilities/vscode';
import { logAnswer } from '@/utilities/common';
import { ChatMode } from '@/types';
import { StorageKey, VSCodeStorage } from '@/utilities/storage';
import './index.css';

type Action = 'copy' | 'redo' | 'delete';

export interface ChatAnswerItemProps {
  title?: string;
  last: boolean;
  loading: boolean;
  itemInfo: any;
  index: number;
  children?: any;
  updateChatData: any;
  submitChatContent?: any;
  followUpLoading?: boolean;
  type?: ChatMode.Free | ChatMode.DevMind;
  operation?: Action[];
  sessionKey: string;
}

const ChatAnswerItem = memo((props: ChatAnswerItemProps) => {
  const {
    title,
    last = false,
    loading = false,
    itemInfo = {},
    index,
    children,
    updateChatData,
    submitChatContent,
    type = ChatMode.Free,
    operation = ['copy', 'redo', 'delete'],
    sessionKey,
    followUpLoading = false,
  } = props || {};
  const {
    content = '',
    references = [],
    rewriteQueries = [],
    isTbsearch,
    resDataType,
    prefix,
    extra,
    id,
    followUpQuestion = '',
    initFollowUp = false,
  } = itemInfo || {};
  const storageKey = type === ChatMode.Free ? StorageKey.FreeChatStore : StorageKey.DevMindStore;

  // 复制整段回复
  const copyAllAnswer = () => {
    // 日志上报
    logAnswer({
      page: type,
      operator: 'copyAllAnswer',
      eventType: 'CLK',
      extData: {},
    });
    vscode.postMessage({
      type: 'clipboard',
      content: { method: 'writeText', text: content },
    });
  };

  // 重新回答选中问题
  const redoAnswer = () => {
    const { id } = itemInfo || {};
    let currentData = VSCodeStorage.getPreMessageById(storageKey, id, sessionKey);
    if (currentData) {
      dispatchEvent(new CustomEvent('redoAnswer'));
      const { content } = currentData || {};
      // 日志上报
      logAnswer({
        page: type,
        operator: 'redoAnswer',
        eventType: 'CLK',
        extData: {
          chatType: resDataType || 'FreeChat',
          content,
        },
      });
      const originList = deleteAnswer();

      submitChatContent({
        value: content,
        originList,
        useRTSearch: !!isTbsearch,
        resDataType,
        prefix,
        extra,
      });
    }
  };

  // 删除选中回答和问题
  const deleteAnswer = () => {
    const { id } = itemInfo || {};
    let data = VSCodeStorage.deleteMessageById(storageKey, id, sessionKey);
    updateChatData(data);
    // 日志上报
    logAnswer({
      page: type,
      operator: 'deleteAnser',
      eventType: 'CLK',
      extData: {},
    });
    return data?.messages;
  };

  return (
    <div className="answer-wrapper">
      {index !== 0 && <Divider style={{ margin: '0' }} />}
      <div className="chat-answer-item-wrapper">
        <div className="chat-answer-header">
          <div className="chat-answer-user">
            <img className="chat-answer-img" src={CROW_ICON} width="24" height="24" />
            <Typography.Text strong>{title || 'Crow Copilot'}</Typography.Text>
            {last && loading && (
              <div className="answer-thinking">
                <div className="answer-thinking-loading"></div>
              </div>
            )}
          </div>
          {!loading && index > 0 && (
            <div className="answer-operation-wrapper">
              {operation.includes('copy') && (
                <Tooltip placement="top" title={'复制'}>
                  <Button
                    className="md-header-op"
                    type="default"
                    size="small"
                    shape="circle"
                    icon={<CopyOutlined />}
                    onClick={copyAllAnswer}
                  />
                </Tooltip>
              )}
              {operation.includes('redo') && (
                <Tooltip placement="top" title={'重试'}>
                  <Button
                    className="md-header-op"
                    type="default"
                    size="small"
                    shape="circle"
                    icon={<RedoOutlined />}
                    onClick={redoAnswer}
                  />
                </Tooltip>
              )}
              {operation.includes('copy') && (
                <Tooltip placement="top" title={'删除'}>
                  <Button
                    className="md-header-op"
                    type="default"
                    size="small"
                    shape="circle"
                    icon={<DeleteOutlined />}
                    onClick={deleteAnswer}
                  />
                </Tooltip>
              )}
            </div>
          )}
        </div>
        <div className="chat-content-wrapper">
          {/* 实时搜索类型回答 */}
          <TbStarAnswer
            id={id}
            isTbsearch={isTbsearch}
            references={references}
            rewriteQueries={rewriteQueries}
          />
          {children ? (
            children
          ) : (
            <MarkDownItem
              content={content}
              type={type}
              references={references}
              isTbsearch={isTbsearch}
            />
          )}
          {/* 追问 */}
          {last && (
            <FollowUpQuestion
              content={content}
              followUpQuestion={followUpQuestion}
              initFollowUp={initFollowUp}
              submitChatContent={submitChatContent}
              followUpLoading={followUpLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
});

export default ChatAnswerItem;
