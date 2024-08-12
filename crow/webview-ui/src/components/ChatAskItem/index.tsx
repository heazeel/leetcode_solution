import { memo, useContext, useMemo } from 'react';
import { USER_ICON } from '@/constant';
import { Typography, Divider, Space, Tag } from 'antd';
import { ChatMode } from '@/types';
import { AppContext } from '@/utilities/context';
import MarkDownItem from '../MarkDownItem';
import './index.css';

const { Text } = Typography;
const ChatAskItem = memo((props: any) => {
  const { itemInfo = {}, type = ChatMode.Free, index } = props || {};
  const { userInfo } = useContext(AppContext);
  // 工号&花名
  const { workId, userNick } = userInfo || {};
  // 头像
  const userIcon = useMemo(() => {
    if (workId) return ``;
    return USER_ICON;
  }, []);
  const { content = '', id, prefix } = itemInfo || {};

  return (
    <div className="answer-wrapper">
      {index !== 0 && <Divider style={{ margin: '0' }} />}
      <div className="chat-ask-item-wrapper">
        <div className="chat-ask-user">
          <img className="chat-ask-img" src={userIcon} width="24" height="24" />
          <Text strong>{userNick || 'You'}</Text>
        </div>
        {prefix && (
          <Space direction="horizontal" size={0}>
            {prefix.map((str: string, index: number) => (
              <Tag bordered={false} color="blue" key={`chat-answer-tag-${id}-${index}`}>
                {str}
              </Tag>
            ))}
          </Space>
        )}
        <MarkDownItem needShrink content={content} type={type} />
      </div>
    </div>
  );
});

export default ChatAskItem;
