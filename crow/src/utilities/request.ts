import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import Stream from 'stream';
import { Logger, LogDecorator } from './logger';
import safeStringify from 'fast-safe-stringify';

// 拦截请求和返回后打印日志
axios.interceptors.request.use(
  function (config) {
    Logger.instance.log(`[${Request.namespace}] - conifg`, config);
    return config;
  },
  function (error) {
    Logger.instance.error(`[${Request.namespace}] - conifg`, error);
    return Promise.reject(error);
  },
);

axios.interceptors.response.use(
  function (response) {
    const data = `{
    "x-aonecopilot-empid": "${response.headers['x-aonecopilot-empid']}",
    "x-model-name": "${response.headers['x-model-name']}",
    "x-protocol": "${response.headers['x-protocol']}",
    "x-request-id": "${response.headers['x-request-id']}",
    "x-session-id": "${response.headers['x-session-id']}",
    "data": "eventStream"
  }`;

    Logger.instance.logApi({
      api: response.config.url!,
      success: true,
      msg: response.statusText,
      httpCode: response.status,
      params: response.config.data,
      response: data,
      method: response.config.method,
      requestType: response.config.responseType,
      traceId: response.headers['eagleeye-traceid'],
    });

    return response;
  },
  function (error: AxiosError) {
    Logger.instance.error(`[${Request.namespace}] - response`, error);
    const config = error.config!;
    const response = error.response;
    Logger.instance.logApi({
      api: config.url!,
      success: false,
      msg: error.message,
      httpCode: response ? response.status : 444444,
      params: config.data,
      method: config.method,
      requestType: config.responseType,
      traceId: response ? response.headers['eagleeye-traceid'] : '',
    });
    return Promise.reject(error);
  },
);

export default class Request {
  private userToken: string;
  private timeout: number;
  private abortController: AbortController;
  static namespace = 'Request';

  constructor({ timeout, userToken }: { timeout: number; userToken: string }) {
    // 创建超时流
    this.abortController = new AbortController();
    this.userToken = userToken;
    this.timeout = timeout;
  }

  @LogDecorator.log(Request.namespace, 'The request was manually aborted.')
  abort() {
    this.abortController.abort();
  }

  async request(config: AxiosRequestConfig) {
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

  requestStream(config: AxiosRequestConfig) {
    return new Promise<Stream>((resolve, reject) => {
      const requestConfig: AxiosRequestConfig = {
        ...config,
        responseType: 'stream',
        signal: this.abortController.signal,
      };
      // 设置 Token
      if (!requestConfig.headers) {
        requestConfig.headers = {
          Authorization: `Bearer ${this.userToken}`,
        };
      } else if (!requestConfig.headers.Authorization) {
        requestConfig.headers.Authorization = `Bearer ${this.userToken}`;
      }
      requestConfig.timeout = this.timeout;

      axios(requestConfig)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error: AxiosError) => {
          reject(error);
        });
    });
  }
}
