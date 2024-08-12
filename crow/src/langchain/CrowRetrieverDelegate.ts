import path from 'path';
import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import CrowFactory from './CrowFactory';
import { loadDocuments, ensureDir } from './utils';

export default class CrowRetrieverDelegate {
  vectorStoreDir: string;
  retrieverOption = {
    // 关键词搜索
    searchKwargs: { fetchK: 5 },
  };
  vectorStore?: Awaited<ReturnType<typeof CrowFactory.createVectorStore>>;
  retriever?: VectorStoreRetriever;

  constructor(readonly workspaceDirectory: string) {
    const vectorStoreDir = path.join(this.workspaceDirectory, './.crow/vector_store');
    this.vectorStoreDir = vectorStoreDir;
  }

  async reset() {
    if (this.vectorStore && this.vectorStoreDir) {
      this.vectorStore.delete({ directory: this.vectorStoreDir });
      const docs = await this.getSplittedDocuments(this.workspaceDirectory);
      this.vectorStore.addDocuments(docs);
      this.vectorStore.save(this.vectorStoreDir);
    }
  }

  async setup() {
    const existVectorStoreDir = ensureDir(this.vectorStoreDir);
    // 如果存在 vector_store 目录，则加载向量数据库
    if (existVectorStoreDir) {
      try {
        const vectorStore = await CrowFactory.createVectorStore({
          vectorStoreDir: this.vectorStoreDir,
        });
        this.vectorStore = vectorStore;
      } catch (error) {
        console.warn('load vector store error. recreate vector store.');
        // 加载异常，则重新处理下
        const docs = await this.getSplittedDocuments(this.workspaceDirectory);
        // 创建向量数据库
        const vectorStore = await CrowFactory.createVectorStore({
          documents: docs,
          vectorStoreDir: this.vectorStoreDir,
        });
        this.vectorStore = vectorStore;
      }
    } else {
      const docs = await this.getSplittedDocuments(this.workspaceDirectory);
      const vectorStore = await CrowFactory.createVectorStore({
        documents: docs,
        vectorStoreDir: this.vectorStoreDir,
      });
      this.vectorStore = vectorStore;
    }
    this.retriever = this.vectorStore.asRetriever(this.retrieverOption);
  }

  // 获取指定目录下所有拆分后的代码文档
  async getSplittedDocuments(directory: string) {
    // 加载代码文档
    const documents = await loadDocuments(directory);
    // 拆分代码片段
    const codeTextSplitter = CrowFactory.createTextSplitter();
    const texts = await codeTextSplitter.splitDocuments(documents);
    return texts;
  }
}