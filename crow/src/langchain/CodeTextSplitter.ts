import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';

// 代码分割，目前支持 js 和 ts
export default class CodeTextSplitter {
  splitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.splitter = RecursiveCharacterTextSplitter.fromLanguage('js', {
      chunkSize: 2048,
      chunkOverlap: 0,
    });
  }

  createDocuments(code: string) {
    return this.splitter.createDocuments([code]);
  }

  splitDocuments(documents: Document[]) {
    return this.splitter.splitDocuments(documents);
  }
}
