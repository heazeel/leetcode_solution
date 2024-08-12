import { Document } from '@langchain/core/documents';
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { BufferMemory } from 'langchain/memory';
import CrowModel from './CrowModel';
import CrowEmbeddings from './CrowEmbedding';
import CodeTextSplitter from './CodeTextSplitter';
import { ALIBABA_API_KEY } from '../constants';

export default class CrowFactory {
  static createModel(): CrowModel {
    return new CrowModel({
      alibabaApiKey: ALIBABA_API_KEY,
      modelName: 'qwen-max',
    });
  }

  static createEmbeddings(): CrowEmbeddings {
    const embeddings = new CrowEmbeddings({
      apiKey: ALIBABA_API_KEY
    });
    return embeddings;
  }

  static createMemory(key = 'chat_history'): BufferMemory {
    return new BufferMemory({
      // Return stored messages as instances of `BaseMessage`
      returnMessages: true,
      // This must match up with our prompt template input variable.
      memoryKey: key,
    });
  }

  static createTextSplitter(): CodeTextSplitter {
    const codeTextSplitter = new CodeTextSplitter();
    return codeTextSplitter;
  }

  static async createVectorStore({
    documents,
    vectorStoreDir,
  }: {
    documents?: Document[];
    vectorStoreDir: string;
  }) {
    // 创建向量化模型
    const embeddings = CrowFactory.createEmbeddings();
    if (documents) {
      // similarity 参考 https://www.npmjs.com/package/ml-distance
      const vectorStore = await HNSWLib.fromDocuments(documents, embeddings);
      // 持久化处理
      vectorStore.save(vectorStoreDir);
      return vectorStore;
    } else {
      const vectorStore = await HNSWLib.load(vectorStoreDir, embeddings);
      return vectorStore;
    }
  }
}
