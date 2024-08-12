import { Embeddings, EmbeddingsParams } from '@langchain/core/embeddings';
import { chunkArray } from '@langchain/core/utils/chunk_array';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { window } from 'vscode';

interface CrowEmbeddingsParams extends EmbeddingsParams {
  // 模型名称，默认 text-embedding-v2。如 text-embedding-v1, text-embedding-v2, text-embedding-async-v1, text-embedding-async-v2
  model?: string;
  // DashScope api key
  apiKey: string;
  // 默认 https://dashscope.aliyuncs.com
  baseUrl?: string;
  // 最大字符长度 默认 2048
  batchSize?: number;
}

interface ResponseData {
  request_id: string;
  usage: {
    total_tokens: number;
  };
  output: {
    embeddings: {
      text_index: number;
      embedding: number[];
    }[];
  }
}

const DEFAULT_EMBEDDINGS_BASE_URL = 'https://dashscope.aliyuncs.com';

/**
 * 基于 DashScope API 封装的向量化类
 * 参考文档:
 * - https://help.aliyun.com/zh/dashscope/developer-reference/text-embedding-api-details
 * - https://help.aliyun.com/zh/dashscope/developer-reference/text-embedding-async-api-details
 */
class CrowEmbeddings extends Embeddings {
  model: string;
  apiKey: string;
  baseUrl: string;
  batchSize: number;
  axiosInstance: AxiosInstance;

  constructor(params: CrowEmbeddingsParams) {
    super(params);
    this.model = params.model || 'text-embedding-v2';
    this.apiKey = params.apiKey;
    this.baseUrl = params.baseUrl || DEFAULT_EMBEDDINGS_BASE_URL;
    this.batchSize = params.batchSize || 25;
    // 创建一个 Axios 实例
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async request(texts: string[], textType: 'query' | 'document'): Promise<{
    text_index: number;
    embedding: number[];
  }[]> {
    // 设置请求的 body 数据
    const data = {
      model: this.model,
      input: {
        texts,
      },
      parameters: {
        text_type: textType
      }
    };

    try {
      // 发送 POST 请求
      const response = await this.axiosInstance.post('/api/v1/services/embeddings/text-embedding/text-embedding', data);
      // 返回响应数据
      const result: ResponseData = response.data;
      return result.output.embeddings;
    } catch (error: AxiosError | any) {
      if (error?.response?.status === 429) {
        window.showErrorMessage('向量化接口限流，请稍后重试');
      }
      // 请求失败，抛出错误
      const msg = error.response?.data?.message || error.message;
      // TODO 上报日志
      console.log(msg);
      throw error;
    }
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    const batches = chunkArray(documents, this.batchSize);
    const embeddings = await Promise.all(batches.map(documents => {
      return this.request(documents, 'document');
    }));
    return embeddings
      .reduce((acc, cur) => acc.concat(cur), [])
      .map(item => item.embedding);
  }

  async embedQuery(document: string): Promise<number[]> {
    const embeddings = await this.request([document], 'query');
    return embeddings[0].embedding;
  }
}

export default CrowEmbeddings;
