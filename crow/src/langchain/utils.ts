import fs from 'fs';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';

export async function loadDocuments(dirPath: string) {
  const loader = new DirectoryLoader(dirPath, {
    '.tsx': path => new TextLoader(path),
    '.js': path => new TextLoader(path),
    '.jsx': path => new TextLoader(path),
    '.ts': path => new TextLoader(path),
    '.json': path => new TextLoader(path),
  });
  const documents = await loader.load();
  return documents;
}

// 检测目录是否存在，如果不存在则创建
export function ensureDir(dirPath: string) {
  const exists = fs.existsSync(dirPath);
  if (!exists) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return exists;
}
