import { ChatItemType, TBStartMode } from '@/types';
import { getTimestamp } from './common';

export interface ChatSessions {
  label: string;
  key: string;
}

export interface DevMindFileList {
  fileName: string;
  percent: number;
  data: string;
  accept: boolean;
}

export interface ChatMessage {
  id: string;
  type: ChatItemType;
  content: string;
  date: string;
  isPromptHints?: boolean;
  isTbsearch?: boolean;
  fileList?: DevMindFileList[];
  [propName: string]: any;
}

export interface DevMindDeps {
  name: string;
  package: string;
  description: string;
  selected: boolean;
}

export interface DevMindMessage {
  date: string;
  type: ChatItemType;
  content: string; // 自然语言
  taskType?: 'generate' | 'fix' | 'unknown'; // 任务类型
  target?: 'deps' | 'schema' | 'ui-code' | 'validate-code';
  fixOpinions?: { filename: string; requirement: string }[]; // 修改内容
  code?: DevMindFileList[];
  deps?: DevMindDeps[];
  schema?: string;
  mock?: string;
  executeStatus?: 'success' | 'fail';
}

export interface DevMindProject {
  sessionId: string;
  lastUpdate: string; // 最近更新时间
  status: number; // 0: 模块初始化阶段 1: 数据配置阶段 2: 代码生成阶段
  messages: DevMindMessage[];
}

export interface DevMindStorage {
  [folderPath: string]: DevMindProject[];
}

export interface SessionItem {
  [propName: string]: ChatStorage;
}

export interface ChatStorage {
  clearContextIndex: number;
  lastUpdate: string;
  messages: ChatMessage[];
}

export enum StorageKey {
  FreeChatStore = 'freeChatSessionStore',
  FreeChatSessions = 'freeChatSessions',
  DevMindStore = 'devMindSessionStoreV2',
  PromptStore = 'promptStore',
  OpenRealtimeSearch = 'useRealTime',
  RealtimeSearchSession = 'realtimeSearchSession',
  TBStartMode = 'tbStartMode',
}

export class VSCodeStorage {
  private static initSessionKey = 'main';
  public static getItem(storageKey: string): SessionItem | null {
    const item = localStorage.getItem(storageKey);
    if (!item) return null;
    return JSON.parse(item);
  }

  public static setItem(key: string, value: any) {
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(value));
  }

  public static initTbStarMode(key: string) {
    const mode = this.getItem(key);
    if (mode) return mode;
    localStorage.setItem(key, TBStartMode.GPT);
  }

  // 根据key初始化存储库
  public static initChatStorage(
    storageKey: string,
    sesstionKey: string = this.initSessionKey,
  ): SessionItem {
    const data = this.getItem(storageKey);
    const sessionData = data && data[sesstionKey];
    if (sessionData) return data;

    const initChatData = {
      clearContextIndex: 0,
      lastUpdate: getTimestamp(),
      messages: [],
    };
    const storageData: SessionItem = data || {};
    storageData[sesstionKey] = initChatData;

    localStorage.setItem(storageKey, JSON.stringify(storageData));

    return storageData;
  }

  // 更新聊天messages
  public static setMessages(
    storageKey: string,
    msgs: any[],
    sessionKey: string = this.initSessionKey,
  ) {
    let data = this.getItem(storageKey);
    if (!data) {
      data = this.initChatStorage(storageKey, sessionKey);
    }

    const sessionData = data[sessionKey] || {};

    sessionData.messages = msgs;
    sessionData.lastUpdate = getTimestamp();
    this.setItem(storageKey, { ...data });

    return { ...sessionData };
  }

  // 更新最后一条聊天messages
  public static setLastMessages(
    storageKey: string,
    msg: any,
    sessionKey: string = this.initSessionKey,
  ) {
    let data = this.getItem(storageKey);
    if (!data) {
      data = this.initChatStorage(storageKey, sessionKey);
    }

    const sessionData = data[sessionKey];

    const messageList = sessionData.messages;

    if (messageList.length) {
      let lastMsg = messageList[messageList.length - 1];
      messageList[messageList.length - 1] = { ...lastMsg, ...msg };
    } else {
      messageList.push(msg);
    }

    sessionData.lastUpdate = getTimestamp();
    this.setItem(storageKey, { ...data });

    return { ...sessionData };
  }

  // 获取记忆id
  public static getMessageIds(storageKey: string, sessionKey: string = this.initSessionKey) {
    const data = this.getItem(storageKey);
    if (!data) {
      return [];
    }

    const sessionData = data[sessionKey];

    const lastClearIndex = sessionData.clearContextIndex;
    const needMemoryList = sessionData.messages
      .splice(lastClearIndex, sessionData.messages.length - lastClearIndex)
      // .filter((msg) => msg.type === ChatItemType.Answer && !msg.isPromptHints && !!msg.id);
      .filter((msg) => msg.type === ChatItemType.Answer && !!msg.id && !msg.isTbsearch);
    const messageIds = needMemoryList.map((msg) => Number(msg.id));

    return messageIds;
  }

  // 清除上下文
  public static clearContext(storageKey: string, sessionKey: string = this.initSessionKey) {
    let data = this.getItem(storageKey);
    if (!data) {
      data = this.initChatStorage(storageKey, sessionKey);
    }

    const sessionData = data[sessionKey];

    sessionData.clearContextIndex = sessionData.messages.length;
    this.setItem(storageKey, { ...data });

    return { ...sessionData };
  }

  // 恢复上下文
  public static restoreContext(storageKey: string, sessionKey: string = this.initSessionKey) {
    let data = this.getItem(storageKey);
    if (!data) {
      data = this.initChatStorage(storageKey, sessionKey);
    }

    const sessionData = data[sessionKey];

    sessionData.clearContextIndex = 0;
    this.setItem(storageKey, { ...data });

    return { ...sessionData };
  }

  // 清除存储
  public static clearStorage(storageKey: string, sessionKey: string = this.initSessionKey) {
    let data = this.getItem(storageKey);
    if (!data) {
      data = this.initChatStorage(storageKey, sessionKey);
    }

    const sessionData = data[sessionKey];

    sessionData.clearContextIndex = 0;
    sessionData.lastUpdate = getTimestamp();
    sessionData.messages = sessionData.messages.splice(0, 1);
    sessionData.messages[0].followUpQuestion = '';

    this.setItem(storageKey, { ...data });

    return { ...sessionData };
  }

  // 根据id获取上条对话内容
  public static getPreMessageById(
    storageKey: string,
    id: string,
    sessionKey: string = this.initSessionKey,
  ) {
    const data = this.getItem(storageKey);
    if (!data) {
      return null;
    }

    const sessionData = data[sessionKey];

    const messageList = sessionData.messages;
    const index = messageList.findIndex((msg) => msg.id === id);
    let message = null;
    if (index > -1) {
      message = messageList[index - 1];
    }

    return message;
  }

  // 根据id删除answer和ask
  public static deleteMessageById(
    storageKey: string,
    id: string,
    sessionKey: string = this.initSessionKey,
  ) {
    let data = this.getItem(storageKey);
    if (!data) {
      data = this.initChatStorage(storageKey, sessionKey);
    }

    const sessionData = data[sessionKey];

    const messageList = sessionData.messages;
    const index = messageList.findIndex((msg) => msg.id === id);
    if (index > -1) {
      const currentMsg = messageList[index];
      const prevMsg = messageList[index - 1];
      if (currentMsg.type === ChatItemType.Answer && prevMsg.type === ChatItemType.Ask) {
        messageList.splice(index - 1, 2);
      }
    }

    sessionData.lastUpdate = getTimestamp();
    this.setItem(storageKey, { ...data });
    return { ...sessionData };
  }
  public static getFreeChatSessions() {
    const sessions = localStorage.getItem(StorageKey.FreeChatSessions);
    if (sessions) {
      const sessionArr = JSON.parse(sessions);
      if (sessionArr.length) return JSON.parse(sessions);
    }
    return this.initFreeChatSessions();
  }
  public static initFreeChatSessions() {
    const sessions = [
      {
        label: '主会话',
        key: 'main',
        closable: false,
      },
    ];
    localStorage.setItem(StorageKey.FreeChatSessions, JSON.stringify(sessions));
    return sessions;
  }
  public static setFreeChatSessions(sessions: ChatSessions[]) {
    localStorage.setItem(StorageKey.FreeChatSessions, JSON.stringify(sessions));
  }
  public static updateFreeChatSession(sessions: ChatSessions[], sessionKey?: string) {
    this.setFreeChatSessions(sessions);
    if (sessionKey) {
      const store = localStorage.getItem(StorageKey.FreeChatStore);
      if (store) {
        const chatStore = JSON.parse(store);
        if (chatStore && chatStore[sessionKey]) {
          try {
            delete chatStore[sessionKey];
            localStorage.setItem(StorageKey.FreeChatStore, JSON.stringify(chatStore));
          } catch (err) {
            console.log(err);
          }
        }
      }
    }
  }
}

export class DevMindStorage {
  public static getItem(
    folderPath: string,
    sessionId: string,
    sessionKey: string = 'main',
  ): DevMindProject | null {
    const store = localStorage.getItem(StorageKey.DevMindStore);
    if (!store) return null;

    const _sessionStore = JSON.parse(store);
    const _store: DevMindStorage = _sessionStore[sessionKey] || {};
    const project = _store[folderPath];
    if (!project || !project.length) return null;

    const session = project.find((item) => item.sessionId === sessionId);
    if (!session) return null;

    return session;
  }

  public static setItem(
    folderPath: string,
    sessionId: string,
    value: { messages: any; status: number },
    sessionKey: string = 'main',
  ): DevMindProject | undefined {
    if (!folderPath || !sessionId || !value) return;

    const initData = {
      sessionId,
      status: 0,
      lastUpdate: getTimestamp(),
      messages: [],
    };

    const store = localStorage.getItem(StorageKey.DevMindStore);
    if (!store) {
      const storageData = {
        [sessionKey]: {
          [folderPath]: [initData],
        },
      };
      localStorage.setItem(StorageKey.DevMindStore, JSON.stringify(storageData));

      return initData;
    }

    const _sessionStore = JSON.parse(store);
    const _store: DevMindStorage = _sessionStore[sessionKey] || {};
    const project = _store[folderPath];

    if (!project) {
      _store[folderPath] = [initData];
      localStorage.setItem(StorageKey.DevMindStore, JSON.stringify(_sessionStore));

      return initData;
    }

    const session = project?.find((item) => item.sessionId === sessionId);

    if (!session) {
      project.push(initData);
      localStorage.setItem(StorageKey.DevMindStore, JSON.stringify(_sessionStore));

      return initData;
    }

    session.messages = value.messages;
    session.status = value.status;
    session.lastUpdate = getTimestamp();

    localStorage.setItem(StorageKey.DevMindStore, JSON.stringify(_sessionStore));

    return session;
  }

  public static getItemByPath(
    folderPath: string,
    sessionKey: string = 'main',
  ): DevMindProject | null {
    const store = localStorage.getItem(StorageKey.DevMindStore);
    if (!store) return null;

    const _sessionStore = JSON.parse(store);
    const _store: DevMindStorage = _sessionStore[sessionKey] || {};
    const project = _store[folderPath];

    if (!project?.length) return null;

    let closestSession = project.reduce((prev, curr) => {
      return curr.lastUpdate > prev.lastUpdate ? curr : prev;
    });

    return closestSession;
  }

  // 获取最后一条消息
  public static getLastMessage(folderPath: string, sessionId: string): DevMindMessage | null {
    const session = this.getItem(folderPath, sessionId);
    if (!session) return null;

    const messages = session.messages;
    if (messages.length) {
      return messages[messages.length - 1];
    }

    return null;
  }

  public static clearStorage(sessionKey: string = 'main') {
    const store = localStorage.getItem(StorageKey.DevMindStore);
    if (!store) return;
    const _sessionStore = JSON.parse(store);
    try {
      if (_sessionStore[sessionKey]) delete _sessionStore[sessionKey];
    } catch (err) {
      console.log(err);
    }
    localStorage.setItem(StorageKey.DevMindStore, JSON.stringify(store));
  }
}
