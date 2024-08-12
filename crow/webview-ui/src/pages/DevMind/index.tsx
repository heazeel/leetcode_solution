import { useState, useEffect } from 'react';
import { vscode } from '@/utilities/vscode';
import { Button, Empty } from 'antd';
import { DevMindStorage, DevMindProject, DevMindDeps } from '@/utilities/storage';
import { ChatMode, ChatItemType, UserInfoProps, DevMindCodeResponse } from '@/types';
import { getDataTime, logDevMind } from '@/utilities/common';
import { CROW_ICON } from '@/constant';
import useWorkSpaceException from './hooks';
import ChatBody from '@/components/ChatBody';
import ChatInput from '@/components/ChatInput';
import ChatAskItem from '@/components/ChatAskItem';
import ChatAnswerItem from '@/components/ChatAnswerItem';
import MarkDownItem from '@/components/MarkDownItem';
import FloatMenu from '@/components/FloatMenu';
import StepArea from './StepArea';
import DepsItem from './DepsItem';
import SchemaItem from './SchemaItem';
import ValidateCodeItem from './ValidateCodeItem';
import UICodeItem from './UICodeItem';
import { AppContext } from '@/utilities/context';
import { DEV_MIND_ANSWER_CONTENT } from './Common/constants';
import styles from './index.module.css';

const DevMind = () => {
  const [fileInfo, isChecked, showException, Exception] = useWorkSpaceException();
  const [pageLoading, setPageLoading] = useState<boolean>(false);
  const [pageError, setPageError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [chatData, setChatData] = useState<DevMindProject>({
    sessionId: '',
    messages: [],
    status: 0,
    lastUpdate: '',
  });
  const [userInfo, setUserInfo] = useState<UserInfoProps>();

  // 初始化数据
  const initDevMindChatData = () => {
    setPageError(false);
    setPageLoading(true);
    const data = DevMindStorage.getItemByPath(fileInfo.uri.path);
    if (!data) {
      vscode.postMessage({
        type: 'devMindSessionCreate',
      });
      return;
    }

    vscode.postMessage({
      type: 'devMindSessionGet',
      content: {
        sessionId: data.sessionId,
      },
    });
  };

  const updateChatData = (updateData?: DevMindProject) => {
    let _chatData = updateData || chatData;
    if (!_chatData?.sessionId) return;
    const data = DevMindStorage.setItem(fileInfo.uri.path, _chatData?.sessionId, {
      messages: [..._chatData.messages],
      status: _chatData.status,
    });

    data && setChatData(data);
  };

  const handleSubmitMsg = (value: string, originList: any[]) => {
    if (!chatData?.sessionId) return;

    const textValue = value.trim();
    if (textValue === '') return;

    const chatAsk = {
      type: ChatItemType.Ask,
      content: textValue || '',
      date: getDataTime(),
    };

    const chatAnswer = {
      type: ChatItemType.Answer,
      content: '依赖分析中...',
      date: getDataTime(),
      taskType: 'generate',
      target: 'deps',
    };

    const _chatList = [...originList, chatAsk, chatAnswer];
    const storedData = DevMindStorage.setItem(fileInfo.uri.path, chatData.sessionId, {
      messages: _chatList,
      status: 0,
    });
    storedData && setChatData(storedData);
    setLoading(true);

    const reqBody: any = {
      type: 'generate',
      target: 'deps',
      requirements: textValue,
    };

    // logDevMind(reqBody);

    vscode.postMessage({
      type: 'devMindSessionAsk',
      content: {
        reqBody,
        sessionId: chatData.sessionId,
      },
    });
  };

  const handleSubmit = (submitData: any) => {
    const { value } = submitData || {};
    handleSubmitMsg(value, chatData?.messages || []);
  };

  const redoAnswer = (submitData: any) => {
    const { value, originList } = submitData || {};
    handleSubmitMsg(value, originList);
  };

  const handleStop = () => {
    setLoading(false);
    // 发送消息
    vscode.postMessage({
      type: 'cancelDevMindMsg',
    });
  };

  // 处理文件进度条
  const handleFileProcess = (data: DevMindCodeResponse) => {
    const { filename, done, delta } = data || {};
    const chatList = chatData.messages;
    let lastAnswer = chatList[chatList.length - 1];
    let tagetCode = lastAnswer.code?.find((item: any) => item.fileName === filename);

    if (!tagetCode) {
      tagetCode = {
        fileName: filename,
        percent: done ? 100 : 0,
        data: `${delta}\n`,
        accept: false,
      };
      const originCode = lastAnswer.code || [];
      const _fileList = [...originCode, tagetCode];
      lastAnswer.code = _fileList;
    } else {
      let percent = tagetCode.percent;
      if (done) {
        percent = 100;
      } else {
        percent += Math.random() * 5;
        if (percent >= 80) {
          percent = 80;
        }
      }

      tagetCode.percent = Math.floor(percent);
      tagetCode.data += delta ? `${delta}\n` : '';
    }
  };

  useEffect(() => {
    const handleMessage = (event: any) => {
      const message = event.data;
      // 接收用户信息
      if (message.type === 'getUserInfo') {
        const { userInfo } = message.content || {};
        if (userInfo) {
          setUserInfo({ ...userInfo });
        }
      }

      // 创建对话
      if (message.type === 'devMindSessionCreateRes') {
        const { data, error } = message.content || {};
        const { session_id } = data.data || {};

        const session = DevMindStorage.setItem(fileInfo.uri.path, session_id, {
          messages: [],
          status: 0,
        });

        if (session) {
          const chatAnswer = {
            type: ChatItemType.Answer,
            content:
              '嗨～请描述一下您想要开发一个什么类型的模块，您可以参照下面的示例来告诉我：\n* 帮我生成一个一排三商品模块\n* 帮我生成一个大促Card入口模块\n* 帮我生成一个商品瀑布流模块',
            date: getDataTime(),
          };
          setChatData({ ...session, messages: [chatAnswer] });
          setPageLoading(false);

          logDevMind({
            sessionId: `【${fileInfo.name}】-【${session.sessionId}】`,
            taskType: 'createSession',
            executeStatus: 'success',
          });
        } else if (error) {
          setPageError(true);

          logDevMind({
            sessionId: `【${fileInfo.name}】`,
            taskType: 'createSession',
            executeStatus: 'fail',
          });
        }
      }

      // 获取对话
      if (message.type === 'devMindSessionGetRes') {
        const { data, error } = message.content || {};
        if (data?.success && data?.data?.session_id) {
          const store = DevMindStorage.getItemByPath(fileInfo.uri.path);
          if (!store) return;

          const { messages = [] } = store || {};
          if (messages.length) {
            setChatData(store);
          } else {
            const chatAnswer = {
              type: ChatItemType.Answer,
              content:
                '嗨～请描述一下您想要开发一个什么类型的模块，您可以参照下面的示例来告诉我：\n* 帮我生成一个一排三商品模块\n* 帮我生成一个大促Card入口模块\n* 帮我生成一个商品瀑布流模块',
              date: getDataTime(),
            };
            setChatData({ ...store, messages: [chatAnswer] });
          }
          setPageLoading(false);

          logDevMind({
            sessionId: `【${fileInfo.name}】-【${data.data.session_id}】`,
            taskType: 'getSessionInfo',
            executeStatus: 'success',
          });
        } else {
          if (error) {
            setPageError(true);
            logDevMind({
              sessionId: `【${fileInfo.name}】`,
              taskType: 'getSessionInfo',
              executeStatus: 'fail',
            });
          } else {
            setPageError(false);
            vscode.postMessage({
              type: 'devMindSessionCreate',
            });
          }
        }
      }

      // 获取问答
      if (message.type === 'devMindSessionAskRes') {
        if (!chatData?.sessionId) return;
        const lastAskMessage = chatData.messages
          .filter((item) => item.type === ChatItemType.Ask)
          .pop();
        const lastMessage = chatData.messages[chatData.messages.length - 1];
        const { type, target } = lastMessage || {};

        const answerContent = target ? DEV_MIND_ANSWER_CONTENT[target] : '';

        if (type === ChatItemType.Answer && target === 'deps') {
          setLoading(false);
          const { data } = message.content || {};
          const packages = (data?.data as DevMindDeps[])?.map((item) => ({
            ...item,
            selected: false,
          }));

          if (!packages?.length) {
            lastMessage.executeStatus = 'fail';
            lastMessage.content = '执行失败，请重试～';
          } else {
            lastMessage.executeStatus = 'success';
            lastMessage.content = answerContent;
          }
          lastMessage.deps = packages;

          logDevMind({
            sessionId: `【${fileInfo.name}】-【${chatData.sessionId}】`,
            ...lastMessage,
            content: lastAskMessage?.content,
          });
          updateChatData();
        }

        if (type === ChatItemType.Answer && target === 'schema') {
          setLoading(false);
          const { data } = message.content || {};
          const { mock = '', schema = '' } = data?.data || {};

          if (!mock || !schema) {
            lastMessage.executeStatus = 'fail';
            lastMessage.content = '执行失败，请重试～';
          } else {
            lastMessage.executeStatus = 'success';
            lastMessage.content = answerContent;
          }
          lastMessage.mock = mock;
          lastMessage.schema = schema;

          logDevMind({
            sessionId: `【${fileInfo.name}】-【${chatData.sessionId}】`,
            ...lastMessage,
            content: lastAskMessage?.content,
          });
          updateChatData();
        }

        if (type === ChatItemType.Answer && target === 'validate-code') {
          const { data, finishReason } = message.content || {};
          if (finishReason === 'success') {
            setLoading(false);
            lastMessage.executeStatus = 'success';
            lastMessage.content = answerContent;

            logDevMind({
              sessionId: `【${fileInfo.name}】-【${chatData.sessionId}】`,
              ...lastMessage,
              content: lastAskMessage?.content,
            });
            updateChatData();
            return;
          }

          if (finishReason && finishReason !== 'success') {
            setLoading(false);
            lastMessage.executeStatus = 'fail';
            lastMessage.content = '执行失败，请重试～';
            logDevMind({
              sessionId: `【${fileInfo.name}】-【${chatData.sessionId}】`,
              ...lastMessage,
              content: lastAskMessage?.content,
            });
          } else {
            lastMessage.executeStatus = 'success';
            lastMessage.content = '正在生成validate代码～';
            handleFileProcess(data);
          }

          updateChatData();
        }

        if (type === ChatItemType.Answer && target === 'ui-code') {
          const { data, finishReason } = message.content || {};
          if (finishReason === 'success') {
            setLoading(false);
            lastMessage.executeStatus = 'success';
            lastMessage.content = answerContent;

            logDevMind({
              sessionId: `【${fileInfo.name}】-【${chatData.sessionId}】`,
              ...lastMessage,
              content: lastAskMessage?.content,
            });
            updateChatData();
            return;
          }

          if (finishReason && finishReason !== 'success') {
            setLoading(false);
            lastMessage.executeStatus = 'fail';
            lastMessage.content = '执行失败，请重试～';
            logDevMind({
              sessionId: `【${fileInfo.name}】-【${chatData.sessionId}】`,
              ...lastMessage,
              content: lastAskMessage?.content,
            });
          } else {
            lastMessage.executeStatus = 'success';
            lastMessage.content = '正在生成ui代码～';
            handleFileProcess(data);
          }
          updateChatData();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [chatData, fileInfo]);

  // 获取用户信息
  useEffect(() => {
    vscode.postMessage({
      type: 'auth',
      content: {
        type: 'getUserInfo',
      },
    });
  }, []);

  useEffect(() => {
    if (isChecked && !showException && fileInfo.uri.path) {
      initDevMindChatData();
    }
  }, [isChecked, showException, fileInfo]);

  const chatListNode = chatData?.messages.length
    ? chatData.messages.map((item, index: number) => {
        const answerItemProps = {
          messageData: item,
          isLast: index === chatData.messages.length - 1,
          chatData,
          updateChatData,
          setAnswerLoading: setLoading,
          answerLoading: loading,
          fileInfo: fileInfo,
        };
        if (item.type === 'ask') {
          return <ChatAskItem itemInfo={item} key={index} index={index} type={ChatMode.DevMind} />;
        }
        return (
          <ChatAnswerItem
            type={ChatMode.DevMind}
            title="Crow DevMind"
            loading={loading}
            last={chatData.messages.length - 1 === index}
            itemInfo={item}
            updateChatData={setChatData}
            submitChatContent={redoAnswer}
            operation={[]}
            index={index}
            key={index}
            sessionKey="main"
          >
            <MarkDownItem content={item.content} type={ChatMode.DevMind} />
            {item.target === 'deps' && <DepsItem {...answerItemProps} />}
            {item.target === 'schema' && <SchemaItem {...answerItemProps} />}
            {item.target === 'validate-code' && <ValidateCodeItem {...answerItemProps} />}
            {item.target === 'ui-code' && (
              <UICodeItem {...answerItemProps} init={initDevMindChatData} />
            )}
          </ChatAnswerItem>
        );
      })
    : [];

  const PageException = (
    <Empty
      style={{ margin: 'auto', marginTop: 100 }}
      image={CROW_ICON}
      imageStyle={{ height: 60 }}
      description={<span>获取数据失败，请刷新页面</span>}
    >
      <Button type="primary" onClick={initDevMindChatData}>
        刷新页面
      </Button>
    </Empty>
  );

  return (
    <div>
      {isChecked && showException && Exception}
      {isChecked && !showException && (
        <div className={styles.devmind_wrapper}>
          <AppContext.Provider value={{ userInfo }}>
            <FloatMenu
              type={ChatMode.DevMind}
              updateChatData={initDevMindChatData}
              sessionKey="main"
            />
            <StepArea status={chatData?.status || 0} />
            {pageError ? (
              PageException
            ) : (
              <ChatBody
                style={{ height: 'auto', flex: 1 }}
                loading={pageLoading}
                chatList={chatListNode}
                chatInput={
                  <ChatInput
                    disabled={chatData.status !== 0}
                    type={ChatMode.DevMind}
                    onSubmit={handleSubmit}
                    onStop={handleStop}
                    loading={loading}
                    inited={!pageLoading}
                    placeholder="请输入需要生成的模块描述"
                  />
                }
              />
            )}
          </AppContext.Provider>
        </div>
      )}
    </div>
  );
};

export default DevMind;
