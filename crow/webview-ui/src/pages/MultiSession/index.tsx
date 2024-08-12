import { useEffect, useState, useRef } from 'react';
import { Tabs, message } from 'antd';
import { vscode } from '@/utilities/vscode';
import { VSCodeStorage } from '@/utilities/storage';
import { AppContext } from '@/utilities/context';
import { UserInfoProps, ISession } from '@/types';
import SessionTabs from './Tabs';
import Chat from '@/pages/Chat';
import './index.css';

const { TabPane } = Tabs;

export default function MultiSession() {
  const [activeKey, setActiveKey] = useState('main');
  const [userInfo, setUserInfo] = useState<UserInfoProps>();
  const [sessions, setSessions] = useState<ISession[]>([]);
  const sessionsRef = useRef<ISession[]>([]);

  const renderTabBar = (tab: any) => {
    return (
      <SessionTabs
        sessions={sessions}
        key={tab.key}
        tab={tab}
        setSessionName={setSessionName}
        activeKey={activeKey}
      />
    );
  };

  const onEdit = (targetKey: any, action: 'add' | 'remove') => {
    if (action === 'add') {
      add();
    } else {
      remove(targetKey);
    }
  };

  const add = () => {
    const newTabs = [...sessions];
    const key = `${new Date().getTime().toString()}-${sessions.length + 1}`;
    newTabs.push({
      label: `新会话`,
      children: <Chat sessionKey={key} setSessionName={setSessionName} sessions={sessions} />,
      key,
      closable: true,
    });
    setSessions(newTabs);
    setActiveKey(key);
    VSCodeStorage.setFreeChatSessions(newTabs);
  };

  const setSessionName = (sessionKey: string, value: string) => {
    const sessionsStorage = VSCodeStorage.getFreeChatSessions();

    const currentSession = sessionsStorage.find(
      (item: ISession) => item.key === sessionKey && sessionKey !== 'main',
    );

    if (currentSession) {
      const sessionsArr = [...sessionsRef.current];
      const sessionItem = sessionsArr.find((session) => session.key === currentSession.key);
      if (sessionItem) {
        sessionItem.label = value;
        console.log(sessionsArr);
        VSCodeStorage.updateFreeChatSession(sessionsArr);
        setSessions([...sessionsArr]);
      }
    }
  };

  const remove = (targetKey: string) => {
    let newActiveKey = activeKey;
    let lastIndex = -1;
    const newSessions: ISession[] = [];
    sessions.forEach((session: ISession, index: number) => {
      if (session.key === targetKey) {
        lastIndex = index - 1;
      } else {
        newSessions.push(session);
      }
    });
    if (newSessions.length && newActiveKey === targetKey) {
      if (lastIndex >= 0) {
        newActiveKey = newSessions[lastIndex].key;
      } else {
        newActiveKey = newSessions[0].key;
      }
    }
    setSessions(newSessions);
    setActiveKey(newActiveKey);
    VSCodeStorage.updateFreeChatSession(newSessions, targetKey);
  };

  const onChange = (key: string) => {
    setActiveKey(key);
  };

  // 获取当前所有会话信息
  useEffect(() => {
    const sessionsStorage = VSCodeStorage.getFreeChatSessions();
    const sessionsArr: ISession[] = [];
    for (let i = 0; i < sessionsStorage.length; i++) {
      const { label, key, closable } = sessionsStorage[i] || {};
      const tabItem = {
        label,
        children: <Chat sessionKey={key} setSessionName={setSessionName} sessions={sessions} />,
        key,
        closable,
      };
      sessionsArr.push(tabItem);
    }
    setSessions(sessionsArr);
  }, []);

  // 获取用户信息
  useEffect(() => {
    vscode.postMessage({
      type: 'auth',
      content: {
        type: 'getUserInfo',
      },
    });
  }, []);

  // 获取vscode传来的消息
  useEffect(() => {
    sessionsRef.current = sessions;
    const handleMessage = (event: any) => {
      const data = event.data;
      const { type, content } = data || {};
      if (type === 'addSession') {
        if (sessions.length >= 10) {
          message.error('最多支持10个会话');
          return;
        }
        add();
      }
      // 接收用户信息
      if (type === 'getUserInfo') {
        const { userInfo } = content || {};
        if (userInfo) {
          setUserInfo({ ...userInfo });
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [sessions]);

  return (
    <>
      <AppContext.Provider value={{ userInfo }}>
        <div className="multi-session-wrapper">
          <Tabs
            // items={sessions}
            activeKey={activeKey}
            onEdit={onEdit}
            onChange={onChange}
            hideAdd
            tabBarGutter={6}
            type="editable-card"
            size="small"
          >
            {sessions.map((tab) => {
              const { children } = tab;
              return (
                <TabPane closable={!!tab.closable} tab={renderTabBar(tab)} key={tab.key}>
                  {children}
                </TabPane>
              );
            })}
          </Tabs>
        </div>
      </AppContext.Provider>
    </>
  );
}
