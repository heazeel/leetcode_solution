import { useEffect, useState, memo, useRef } from 'react';
import { vscode } from '@/utilities/vscode';
import { VSCodeStorage, StorageKey, ChatStorage, ChatMessage } from '@/utilities/storage';
import ChatAnswerItem from '@/components/ChatAnswerItem';
import ChatAskItem from '@/components/ChatAskItem';
import ChatInput from '@/components/ChatInputMentions';
import ChatBody from '@/components/ChatBody';
import ChatClearMem from '@/components/ChatClearMem';
import { ChatMode, CHAT_CONTENT, ChatItemType, ISession, ISubmitData } from '@/types';
import FloatMenu from '@/components/FloatMenu';
import { INIT_CONTENT } from '@/constant';
import {
  getDataTime,
  getTimestamp,
  generateUUID,
  validateFollowUpQestion,
} from '@/utilities/common';

interface ChatProps {
  sessionKey: string;
  setSessionName: (sessionKey: string, value: string) => void;
  sessions: ISession[];
}

const Chat = memo((props: ChatProps) => {
  const { sessionKey, setSessionName } = props;
  const [chatData, setChatData] = useState<ChatStorage>({
    clearContextIndex: 0,
    lastUpdate: getTimestamp(),
    messages: [],
  });
  const [pageLoading, setPageLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [followUpLoading, setFollowUpLoading] = useState<boolean>(false);
  const isUseRTSearch = useRef<boolean>(false);
  const currentAnswerType = useRef<string>('');
  const chatDataRef = useRef<ChatStorage>({
    clearContextIndex: 0,
    lastUpdate: getTimestamp(),
    messages: [],
  });

  const updateChatData = (data: ChatStorage) => {
    chatDataRef.current = data;
    setChatData(data);
  };

  // 提交对话
  const submitChatContent = (submitData: ISubmitData) => {
    const { value, extra, originList, useRTSearch, resDataType, prefix, updateFollowUpQestion } =
      submitData || {};
    if (chatData.messages.length === 1) {
      setSessionName(sessionKey, value);
    }
    currentAnswerType.current = resDataType || '';
    let textValue = value.trim();
    if (textValue === '') return;

    isUseRTSearch.current = !!useRTSearch;
    const chatAsk = {
      id: getTimestamp(),
      type: ChatItemType.Ask,
      content: textValue,
      date: getDataTime(),
      resDataType: resDataType || '',
      prefix: extra ? [extra.promptKey] : prefix,
    };

    const chatAnswer = {
      id: '',
      type: ChatItemType.Answer,
      content: '',
      date: getDataTime(),
      isPromptHints: !!extra,
      isTbsearch: useRTSearch,
      resDataType: resDataType || '',
      prefix: extra ? [extra.promptKey] : prefix,
      extra,
    };

    const chatList = chatData.messages;

    let _chatList;
    if (originList?.length) {
      _chatList = [...originList, chatAsk, chatAnswer];
    } else {
      _chatList = [...chatList, chatAsk, chatAnswer];
    }

    if (updateFollowUpQestion && _chatList.length >= 3) {
      _chatList[_chatList.length - 3].followUpQuestion = '';
    }

    // 增加对话
    const storedData = VSCodeStorage.setMessages(StorageKey.FreeChatStore, _chatList, sessionKey);
    setChatData(storedData);
    chatDataRef.current = storedData;

    const historyMessages = storedData.messages.slice(
      storedData.messages.length - 7 < 0 ? 0 : storedData.messages.length - 7,
      storedData.messages.length - 2,
    );

    setLoading(true);
    setFollowUpLoading(true);
    const messageIds = VSCodeStorage.getMessageIds(StorageKey.FreeChatStore, sessionKey);
    let extraParams = {};
    if (extra) {
      const { template, promptKey, prompt } = extra || {};
      textValue = prompt ? prompt : `${template}${textValue}`;
      extraParams = {
        promptKey: promptKey,
        extraHeader: {
          'x-prompt-key': promptKey,
        },
      };
    }

    const uuid = generateUUID();
    // 发送消息
    if (useRTSearch) {
      const sessionId = VSCodeStorage.getItem(StorageKey.RealtimeSearchSession) || '';
      vscode.postMessage({
        type: 'sendSearchMsg',
        content: {
          userQuery: textValue,
          sessionId,
          id: uuid,
          sessionKey,
          lastMessageIds: !extra ? messageIds : [],
          history: historyMessages,
        },
      });
    } else if (resDataType) {
      if (resDataType === 'RealTimeSearch') {
      } else if (resDataType === 'DeveloperAssistant') {
        vscode.postMessage({
          type: 'sendDeveloperAssistantMsg',
          content: {
            inputParams: {
              question: textValue,
            },
            id: uuid,
            sessionKey,
            lastMessageIds: !extra ? messageIds : [],
            history: historyMessages,
          },
        });
      }
    } else {
      vscode.postMessage({
        type: 'sendFreeChatMsg',
        content: {
          sessionKey,
          prompt: textValue,
          lastMessageIds: !extra ? messageIds : [],
          ...extraParams,
          history: historyMessages,
        },
      });
    }
  };

  const stopAnswer = () => {
    const type = currentAnswerType.current;
    let msgType = !isUseRTSearch.current ? 'cancelFreeChatMsg' : 'cancelSearchMsg';
    if (type === 'DeveloperAssistant') {
      msgType = 'cancelDeveloperAssistantMsg';
    }

    vscode.postMessage({
      type: msgType,
    });

    setLoading(false);
    setFollowUpLoading(false);
  };

  const getSuggestQuestions = (data: { content: string[]; sessionKey: string }, isInit = false) => {
    setFollowUpLoading(false);
    setLoading(false);
    const { content } = data || {};
    if (sessionKey !== data.sessionKey) return;
    const isValid = validateFollowUpQestion(content);
    // 返回追问到数据格式有问题时，不增加追问
    if (!isValid) return false;
    const messages = chatDataRef.current.messages;
    let storedData: ChatStorage;
    if (!isInit) {
      const lastAnswer = messages[messages.length - 1];
      let currentAnswer: CHAT_CONTENT = {
        ...lastAnswer,
        id: lastAnswer.id,
        content: lastAnswer.content,
        type: ChatItemType.Answer,
        date: getDataTime(),
        followUpQuestion: JSON.stringify(content),
      };
      storedData = VSCodeStorage.setLastMessages(
        StorageKey.FreeChatStore,
        currentAnswer,
        sessionKey,
      );
    } else {
      messages[0].followUpQuestion = JSON.stringify(content);
      messages[0].initFollowUp = true;
      storedData = VSCodeStorage.setMessages(StorageKey.FreeChatStore, messages, sessionKey);
    }
    setChatData(storedData);
    chatDataRef.current = storedData;
  };

  // 自由聊天数据
  const getChatRes = (data: CHAT_CONTENT) => {
    const { id, content, finishReason, error, resDataType, abstractInfo, query } = data || {};
    if (sessionKey !== data.sessionKey) return;
    // 星辰百晓集团内模型回答最终结束时，content会返回空，导致数据丢失，特殊处理一下
    if (content === undefined && !finishReason) return;
    if (content === undefined && finishReason && resDataType === 'tbstarSearch') {
      setLoading(false);
      return;
    }

    const messages = chatDataRef.current.messages;
    const lastAnswer = messages[messages.length - 1];
    let currentAnswer: CHAT_CONTENT = {
      ...lastAnswer,
      id,
      content,
      type: ChatItemType.Answer,
      date: getDataTime(),
    };

    // 实时搜索参考文档
    if (resDataType === 'references') {
      currentAnswer.resDataType = resDataType;
      if (currentAnswer.references) {
        currentAnswer.references = [...currentAnswer.references, abstractInfo];
      } else {
        currentAnswer.references = [abstractInfo];
      }
    }
    // 实时搜索关键词
    if (resDataType === 'rewriteQueries') {
      currentAnswer.resDataType = resDataType;
      if (currentAnswer.rewriteQueries) {
        currentAnswer.rewriteQueries = [...currentAnswer.rewriteQueries, query];
      } else {
        currentAnswer.rewriteQueries = [query];
      }
    }
    if (finishReason) {
      // 当前回复结束
      setLoading(false);
      const chatList = chatData.messages;
      const lastAnswer = chatList[chatList.length - 1];
      // 接口错误时，无id返回，手动设置错误id
      if (
        !lastAnswer?.content &&
        finishReason === 'error' &&
        error &&
        error.code &&
        error.code !== 'ERR_CANCELED'
      ) {
        currentAnswer.id = getTimestamp();
        const { message = '接口超时，请重试～' } = error || {};
        currentAnswer.content = `${content}: ${message}`;
      }
    }

    const storedData = VSCodeStorage.setLastMessages(
      StorageKey.FreeChatStore,
      currentAnswer,
      sessionKey,
    );
    setChatData(storedData);
    chatDataRef.current = storedData;
  };

  const initChatData = () => {
    setPageLoading(true);
    const storedData: any = VSCodeStorage.initChatStorage(StorageKey.FreeChatStore, sessionKey);
    const data = storedData[sessionKey] || {};
    setChatData(data);
    chatDataRef.current = data || {};
    if (!data.messages.length) {
      getChatRes({
        id: getTimestamp(),
        finishReason: 'success',
        content: INIT_CONTENT,
        sessionKey,
      });
      vscode.postMessage({
        type: 'sendFreeChatMsg',
        content: {
          sessionKey,
          prompt: '',
          lastMessageIds: [],
          type: 'initFollowUpQuestion',
        },
      });
      setFollowUpLoading(true);
      setPageLoading(false);
      return;
    }

    setTimeout(() => {
      setPageLoading(false);
    }, 500);
  };

  // 获取上一条提问内容
  const getAskItem = (position: 'pre' | 'next', id?: string): ChatMessage | undefined | '' => {
    const preAskList = chatData.messages.filter((item) => item.type === 'ask');
    if (!preAskList.length) return;

    if (!id) {
      return position === 'pre' ? preAskList[preAskList.length - 1] : '';
    }

    const index = preAskList.findIndex((item: any) => item.id === id);
    if (index - 1 < 0 && position === 'pre') return;
    if (index + 1 >= preAskList.length && position === 'next') return '';

    return position === 'pre' ? preAskList[index - 1] : preAskList[index + 1];
  };

  // 获取vscode传来的消息
  useEffect(() => {
    initChatData();
    const handleMessage = (event: any) => {
      const message = event.data;
      const { type, content } = message || {};
      if (type === 'tbstarSessionData') {
        const { data } = content || {};
        if (data) {
          VSCodeStorage.setItem(StorageKey.RealtimeSearchSession, `${data}`);
        }
      }

      if (type === 'freeChatResData') {
        setPageLoading(false);
        getChatRes(content);
      }

      if (type === 'followUpQuestion') {
        getSuggestQuestions(content);
      } else if (type === 'initFollowUpQuestion') {
        getSuggestQuestions(content, true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const chatListNode = chatData.messages.length
    ? chatData.messages.map((item: any, index: number) => {
        if (item.type === 'ask') {
          return <ChatAskItem itemInfo={item} key={index} index={index} />;
        }

        return (
          <>
            <ChatAnswerItem
              loading={loading}
              followUpLoading={followUpLoading}
              last={chatData.messages.length - 1 === index}
              itemInfo={item}
              index={index}
              key={index}
              updateChatData={updateChatData}
              submitChatContent={submitChatContent}
              sessionKey={sessionKey}
            />
            {chatData.clearContextIndex === index + 1 && (
              <ChatClearMem
                type={ChatMode.Free}
                updateChatData={updateChatData}
                sessionKey={sessionKey}
              />
            )}
          </>
        );
      })
    : [];

  return (
    <>
      <FloatMenu type={ChatMode.Free} updateChatData={updateChatData} sessionKey={sessionKey} />
      <ChatBody
        loading={pageLoading}
        chatList={chatListNode}
        chatInput={
          <ChatInput
            loading={loading}
            inited={!pageLoading}
            onSubmit={submitChatContent}
            onStop={stopAnswer}
            showQuickQp
            sessionKey={sessionKey}
            getAskItem={getAskItem}
          />
        }
      />
    </>
  );
});
export default Chat;
