import { window, ExtensionContext } from 'vscode';
import Request from './request';
import { GlobalState } from './state';
import {
  parseStreamData,
  LineSplitTransform,
  TimeoutDetector,
  parseTBStarStreamData,
} from './common';
import {
  FREE_CHAT_API,
  USER_TOKEN_CONTEXT_KEY,
  CODE_CHAT_API_HOST_PRE,
  CODE_CHAT_API_PATH,
  CODE_CHAT_CREATE_SESSION_PATH,
  CODE_CHAT_GET_SESSION_PATH,
  CODE_CHAT_SESSION_ASK_PATH,
  CODE_CHAT_SESSION_TELL_PATH,
  CROW_USER_INFO,
} from '../constants';

export interface FreeChatRequest {
  sessionKey: string;
  prompt: string;
  needAppend?: boolean;
  lastMessageIds?: number[];
  promptKey?: string;
  history?: { type: string; content: string }[];
  extraHeader?: any;
  type?: string;
}

export interface DevMindRequest {
  prompt: string;
  lastMessageIds?: number[];
}

export interface FreeChatResponse {
  finishReason?: any;
  id: string;
  content: string;
}

export interface DevMindResponse {
  done: boolean;
  filename: string;
  delta: string;
}

export interface DevMindCreateSessionResponse {
  sessionId: string;
}

/**
 * generate: 生成
 * fix: 修改
 * unknown: 未知（AI 自行判断）
 */
export type DevMindAskType = 'generate' | 'fix' | 'unknown';

/**
 * deps: 依赖
 * code: 代码
 * schema: schema
 * ui-code: ui代码
 * validate-code: 校验代码
 * trace-code: 追踪代码
 */
export type DevMindAskTarget =
  | 'deps'
  | 'code'
  | 'schema'
  | 'ui-code'
  | 'validate-code'
  | 'trace-code';

export interface DevMindAskBody {
  type: DevMindAskType;
  target: DevMindAskTarget;
  requirements: string; // 自然语言描述
  fixOpinions: { filename: string; requirement: string }[]; // 修改内容
}

export interface DevMindAskRequest {
  reqBody: DevMindAskBody;
  sessionId: string;
}

export interface DevMindTellBody {
  event: 'userSelect' | 'userFix' | 'userDrop' | 'userAccept';
  target: 'deps' | 'code' | 'schema';
  schema?: string;
  mock?: string;
  codes?: DevMindAskCodeResponse[];
  deps?: string[];
}

export interface DevMindTellRequest {
  reqBody: DevMindTellBody;
  sessionId: string;
}

//【deps 依赖】返回结构
export interface DevMindAskDepsResponse {
  name: string;
  package: string;
  description: string;
}

//【code 代码类】返回结构
export interface DevMindAskCodeResponse {
  done: boolean;
  filename: string;
  delta: string;
  hasData?: boolean;
}

// 【schema】返回结构
export type DevMindAskSchemaResponse = string;

export type DevMindAskResponse =
  | DevMindAskDepsResponse
  | DevMindAskCodeResponse
  | DevMindAskSchemaResponse;

export interface DevMindSessionGetRequest {
  sessionId: string;
}

export type DevMindSessionGetResponse = {
  session_id: string;
  schema: string;
  mock: string;
  codes: DevMindAskCodeResponse[];
  deps: string[];
  knowledges: string[];
};

export interface DevMindInsertCodeInput {
  sessionId: string;
  codes: { path: string; text: string }[];
}

function getUserToken(context: ExtensionContext) {
  const userToken = GlobalState.get(context, USER_TOKEN_CONTEXT_KEY, '');
  if (!userToken || !userToken.value) {
    window.showErrorMessage('用户未登录');
    return null;
  }
  return userToken.value;
}

export interface TbStarsRequest {
  token: string;
  sessionId: string;
  id?: string;
  sessionKey: string;
  userId: string;
  userQuery: string;
  history?: { type: string; content: string }[];
  lastMessageIds?: number[];
}

export enum TbStarResType {
  rewriteQueries = 'rewriteQueries',
  webSearch = 'webSearch',
  references = 'references',
  text = 'text',
}

export interface TbStarsResponse {
  type: TbStarResType;
  sessionId: string;
  content?: string;
  text?: string;
}

export interface DeveloperAssistantRequest {
  inputParams: {
    question: string;
  };
  id: string;
  debug?: boolean;
  sessionKey: string;
  lastMessageIds?: number[];
  history?: { type: string; content: string }[];
}

export interface DeveloperAssistantResponse {
  finishReason?: any;
  id: string;
  content: string;
}

function getUserInfo(context: ExtensionContext) {
  const useInfo = GlobalState.get(context, CROW_USER_INFO, '');

  if (!useInfo || !useInfo.value) {
    return null;
  }

  return useInfo.value;
}

abstract class Chat<Input, Output> {
  protected timeout?: number;
  protected currentRequest?: Request;

  constructor(readonly context: ExtensionContext) {}

  protected createRequest() {
    const userToken = getUserToken(this.context);
    if (!userToken) {
      return null;
    }
    const request = new Request({ timeout: this.timeout || 5_000, userToken });
    this.currentRequest = request;
    return request;
  }

  public cancelCurrentChat() {
    if (this.currentRequest) {
      this.currentRequest.abort();
    }
  }

  public abstract reply(input: Input, onStreamData?: (data: Output) => void): Promise<any>;
}

export class FreeChat extends Chat<FreeChatRequest, FreeChatResponse> {
  private currentTimeoutDetector?: TimeoutDetector;

  constructor(context: ExtensionContext) {
    super(context);
    this.timeout = 15_000;
  }

  public cancelCurrentChat() {
    if (this.currentRequest) {
      this.currentRequest.abort();
      if (this.currentTimeoutDetector) {
        this.currentTimeoutDetector.clearTimer();
      }
    }
  }

  public async reply(input: FreeChatRequest, onStreamData?: (data: FreeChatResponse) => void) {
    const client = this.createRequest();
    if (!client) {
      return;
    }

    const response = await client.requestStream({
      method: 'post',
      url: FREE_CHAT_API,
      data: input,
    });

    this.currentTimeoutDetector = new TimeoutDetector(this.timeout!);
    const stream = response.pipe(this.currentTimeoutDetector);
    const dataset: FreeChatResponse[] = [];
    let appendStr = '';
    return new Promise((resolve, reject) => {
      stream.on('data', (data) => {
        const dataObjects = parseStreamData<FreeChatResponse>(data.toString());
        if (dataObjects.length) {
          const chunk = dataObjects[0];
          if (typeof input.needAppend === 'boolean' && !input.needAppend) {
            // 兼容逻辑 gpt和通义返回逻辑不同
            if (chunk.content && chunk.finishReason !== 'stop') {
              appendStr += chunk.content;
            }
            chunk.content = appendStr;
          }
          dataset.push(chunk);
          onStreamData && onStreamData(chunk);
        }
      });
      stream.on('end', resolve);
      stream.on('close', resolve);
      stream.on('error', reject);
      this.currentTimeoutDetector!.on('timeout', () => {
        // 关闭请求&销毁流
        client.abort();
        stream.destroy();
        reject(new Error('timeout'));
      });
    }).then(() => {
      return dataset;
    });
  }

  public async normalReply(input: string, lastMessageIds?: number[]) {
    const client = this.createRequest();
    if (!client) {
      return;
    }

    const response = await client.request({
      method: 'post',
      url: 'https://test.com/v1/chat',
      data: {
        prompt: input,
        stream: false,
        lastMessageIds,
      },
    });

    if (response.data) {
      return response.data;
    } else {
      throw new Error('data not found');
    }
  }
}

export class DevMind extends Chat<DevMindRequest, DevMindResponse> {
  constructor(context: ExtensionContext) {
    super(context);
    this.timeout = 100_000;
  }

  public async reply(input: DevMindRequest, onStreamData?: (data: DevMindResponse) => void) {
    const client = this.createRequest();
    if (!client) {
      return;
    }

    const response = await client.requestStream({
      method: 'post',
      url: `${CODE_CHAT_API_HOST_PRE}${CODE_CHAT_API_PATH}`,
      data: {
        requirement: input.prompt,
        stream: true,
      },
    });
    const timeoutDetector = new TimeoutDetector(15_000);
    const stream = response.pipe(timeoutDetector).pipe(new LineSplitTransform());

    return new Promise((resolve, reject) => {
      stream.on('data', (data) => {
        // 返回字符串：
        // data: { "filename": "index.js", "delta": "const { StreamLine, processors, validate } = DataProcessor;", "done": false }
        // data: { "filename": "index.js", "delta": "const { reshape, flat, checkSoldout, filter, shrink } = processors;", "done": false }
        // data: { "filename": "index.js", "delta": "", "done": false }
        // data: { "filename": "index.js", "delta": "function hideModule(moduleId, data) {", "done": false }
        const dataObjects = parseStreamData<DevMindResponse>(data.toString());
        if (dataObjects.length) {
          const chunk = dataObjects[0];
          onStreamData && onStreamData(chunk);
        }
      });
      stream.on('end', resolve);
      stream.on('close', resolve);
      stream.on('error', reject);
      timeoutDetector.on('timeout', () => {
        // 关闭请求&销毁流
        client.abort();
        stream.destroy();
        reject(new Error('timeout'));
      });
    });
  }

  // 创建会话
  public async createSession(): Promise<DevMindCreateSessionResponse> {
    const client = this.createRequest();
    if (!client) {
      return Promise.reject();
    }

    const response = await client.request({
      method: 'post',
      url: `${CODE_CHAT_API_HOST_PRE}${CODE_CHAT_CREATE_SESSION_PATH}`,
      data: {
        knowledges: ['nextdy', 'alimod'],
      },
    });
    return response.data;
  }

  // 获取会话
  public async getSession(input: DevMindSessionGetRequest) {
    const client = this.createRequest();
    if (!client || !input || !input.sessionId) {
      return Promise.reject();
    }

    const PATH = CODE_CHAT_GET_SESSION_PATH.replace(':session_id', input.sessionId);

    const response = await client.request({
      method: 'get',
      url: `${CODE_CHAT_API_HOST_PRE}${PATH}`,
    });

    return response.data;
  }

  // 询问 AI (执行生成任务相关)
  public async sessionAsk(
    input: DevMindAskRequest,
    onStreamData?: (data: DevMindAskResponse) => void,
  ) {
    const client = this.createRequest();
    if (!client || !input || !input.sessionId) {
      return Promise.reject();
    }

    const PATH = CODE_CHAT_SESSION_ASK_PATH.replace(':session_id', input.sessionId);
    const req = {
      method: 'post',
      url: `${CODE_CHAT_API_HOST_PRE}${PATH}`,
      data: {
        type: input.reqBody.type,
        target: input.reqBody.target,
        requirements: input.reqBody.requirements,
        fixOpinions: input.reqBody.fixOpinions,
      },
    };

    if (input.reqBody.target.includes('code')) {
      const response = await client.requestStream(req);

      const timeoutDetector = new TimeoutDetector(this.timeout!);
      const stream = response.pipe(timeoutDetector).pipe(new LineSplitTransform());

      return new Promise((resolve, reject) => {
        stream.on('data', (data) => {
          console.log('data:', data.toString());
          const dataObjects = parseStreamData<DevMindAskCodeResponse>(data.toString());
          if (dataObjects.length) {
            const chunk = dataObjects[0];
            onStreamData && onStreamData({ ...chunk });
          }
        });
        stream.on('end', () => resolve({ result: 'end' }));
        stream.on('close', () => reject({ result: 'close' }));
        stream.on('error', () => reject(new Error('error')));
        timeoutDetector.on('timeout', () => {
          // 关闭请求&销毁流
          client.abort();
          stream.destroy();
          reject(new Error('timeout'));
        });
      });
    } else {
      const response = await client.request(req);
      return response.data;
    }
  }

  // 告知 AI (同步一些上下文的更新，比如用户选择了依赖，用户修改了代码等)
  public async sessionTell(input: DevMindTellRequest) {
    const client = this.createRequest();
    if (!client || !input || !input.sessionId) {
      return Promise.reject();
    }

    const PATH = CODE_CHAT_SESSION_TELL_PATH.replace(':session_id', input.sessionId);

    const response = await client.request({
      method: 'post',
      url: `${CODE_CHAT_API_HOST_PRE}${PATH}`,
      data: {
        data: {
          event: input.reqBody.event,
          target: input.reqBody.target,
          mock: input.reqBody.mock || '',
          schema: input.reqBody.schema || '',
          deps: input.reqBody.deps || [],
          codes: input.reqBody.codes || [],
        },
      },
    });

    return response.data;
  }
}
