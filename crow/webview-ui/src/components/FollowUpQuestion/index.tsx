import { useMemo } from 'react';
import { Typography, Space } from 'antd';
import { MentionsDelegate } from '@/utilities/mentions';
import { ISubmitData, ChatMode } from '@/types';
import { logFollowUp } from '@/utilities/common';
import { LoadingOutlined } from '@ant-design/icons';
import './index.css';

const mentionsDelegate = new MentionsDelegate([], false);
const prefixOptions = mentionsDelegate.getMentions();
interface IFollowUpQuestionProps {
  followUpQuestion: string;
  initFollowUp?: boolean;
  followUpLoading: boolean;
  content: string;
  submitChatContent: (content: any) => void;
}

const FollowUpQuestion = (props: IFollowUpQuestionProps) => {
  const {
    followUpQuestion,
    submitChatContent,
    content = '',
    initFollowUp = false,
    followUpLoading = false,
  } = props;

  // 追问问题
  const closelyAnswerItems = useMemo(() => {
    try {
      if (!followUpQuestion) return [];
      const items = JSON.parse(followUpQuestion);
      return items;
    } catch (error) {
      console.error(error);
      return [];
    }
  }, [followUpQuestion]);

  // 获取追问问题标题
  const getCloselyAnswerName = (text: string) => {
    const filterPrefix = prefixOptions['/'].filter((item) => {
      return text.indexOf(item.name) > -1;
    });
    const resTypes = prefixOptions['@'].filter((item) => {
      return text.indexOf(item.name) > -1;
    });

    let value = (filterPrefix[0] && text.replace(`${filterPrefix[0]?.name}:`, '')) || text;

    const submitParams: ISubmitData = {
      value,
      updateFollowUpQestion: true,
    };

    if (filterPrefix.length > 0) {
      submitParams.prefix = filterPrefix.map((item) => {
        return item.name;
      });
    }
    if (resTypes.length > 0) {
      const resType = resTypes[0].value;
      submitParams.resDataType = resType;
      if (resType === 'RealTimeSearch') {
        submitParams.useRTSearch = true;
      }
    }

    submitChatContent(submitParams);
    logFollowUp({
      page: ChatMode.Free,
      operator: resTypes[0]?.value || 'common',
      eventType: 'CLK',
      extData: {
        resType: resTypes[0]?.value || 'common',
        question: text,
      },
    });
  };

  if (followUpLoading && content.length) {
    return (
      <div className="closely-loading-wrapper">
        <LoadingOutlined className="chat-text-icon" />
        <span className="closely-loading-text">追问问题生成中...</span>
      </div>
    );
  }

  // 无追问问题时隐藏模块
  if (closelyAnswerItems.length <= 0 || !content) return null;

  return (
    <div className="closely-answer-wrapper">
      <Space direction="vertical" size="small">
        <Typography.Text>💡 {initFollowUp ? '试试这样问我：' : '继续追问：'}</Typography.Text>
        {closelyAnswerItems.map((item: string, index: number) => {
          return (
            <Typography.Link
              key={`closely-answer-item-${index}`}
              onClick={() => {
                getCloselyAnswerName(item);
              }}
              title="点击就能直接发起追问哦～"
            >
              {item}
            </Typography.Link>
          );
        })}
      </Space>
    </div>
  );
};

export default FollowUpQuestion;
