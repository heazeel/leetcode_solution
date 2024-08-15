import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { ChatAlibabaTongyi } from '@langchain/community/chat_models/alibaba_tongyi';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { getConfig } from '../utils';
import { CROW_USER_TOKEN } from '../const';

axios.interceptors.request.use(
  function (config) {
    return config;
  },
  function (error) {
    return Promise.reject(error);
  },
);

axios.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error: AxiosError) {
    return Promise.reject(error);
  },
);

export default class Request {
  private userToken: string;
  private timeout: number;
  private abortController: AbortController;

  constructor({ timeout, userToken }: { timeout: number; userToken: string }) {
    // 创建超时流
    this.abortController = new AbortController();
    this.userToken = userToken;
    this.timeout = timeout;
  }

  abort() {
    this.abortController.abort();
  }

  public async request(config: AxiosRequestConfig) {
    // 设置 Token
    if (!config.headers) {
      config.headers = {
        Authorization: `Bearer ${this.userToken}`,
      };
    } else if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${this.userToken}`;
    }
    config.timeout = this.timeout;
    config.signal = this.abortController.signal;
    return axios(config);
  }

  // 通义千问大模型
  public static async requestTongyi(
    template: string,
    input: { [key: string]: string },
    useLongContext = false,
  ): Promise<string> {
    try {
      const config = getConfig();
      const alibabaApiKey = config.alibabaApiKey;

      const qwen = new ChatAlibabaTongyi({
        alibabaApiKey,
        temperature: 1,
        modelName: useLongContext ? 'qwen-plus' : 'qwen-turbo',
      });

      const prompt = ChatPromptTemplate.fromTemplate(template);
      const outputParser = new StringOutputParser();
      // @ts-ignore
      const chain = RunnableSequence.from([prompt, qwen, outputParser]);
      const resdata = await chain.invoke(input);

      return resdata;
    } catch (err) {
      throw new Error(err);
    }
  }

  public static async requestTongyiTokenizer(
    prompt: string,
    model: 'qwen-turbo' | 'qwen-plus' = 'qwen-turbo',
  ): Promise<number> {
    const api = 'https://dashscope.aliyuncs.com/api/v1/tokenizer';
    const config = getConfig();
    const alibabaApiKey = config.alibabaApiKey;

    return new Promise((resolve, reject) => {
      axios({
        headers: {
          Authorization: `Bearer ${alibabaApiKey}`,
          'Content-Type': 'application/json',
        },
        method: 'post',
        url: api,
        data: {
          model,
          input: {
            prompt,
          },
        },
      })
        .then((res) => {
          const tokenSize = res?.data?.usage?.input_tokens;
          resolve(tokenSize);
        })
        .catch(() => {
          reject('token计算服务出错,请重试');
        });
    });
  }
}
