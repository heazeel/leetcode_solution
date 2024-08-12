import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { StatusBarAlignment, StatusBarItem, window } from 'vscode';
import { ALIBABA_API_KEY } from '../constants';

// async function createOnlineStore(projectDir: string) {
//   const store = new CrowStore({ apiKey: ALIBABA_API_KEY, projectDir });
//   await store.setup();
//   await store.save();
//   return store;
// }

export class InlineCompletionEnhancer {
  ready: boolean = false;
  // store?: CrowStore;
  offlineVectorStoreDir: string;
  loadingStatusBarItem: StatusBarItem;

  constructor(public projectDir: string) {
    const userHome = process.env.HOME || process.env.USERPROFILE;
    if (!userHome) {
      throw new Error('无法获取到用户目录');
    }
    const crowDir = path.join(userHome, '.crow/');
    if (!crowDir) {
      throw new Error('无法获取到 .crow 目录');
    }
    this.offlineVectorStoreDir = path.join(crowDir, 'vector_store');
    this.loadingStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 150);
  }

  async setup() {
    this.loadingStatusBarItem.text = '$(loading~spin) 加载离线向量数据';
    this.loadingStatusBarItem.show();
    await new Promise((resolve, reject) => {
      if (fs.existsSync(this.offlineVectorStoreDir)) {
        // 如果已存在，则使用 git pull 获取最新代码
        exec(`git -C ${this.offlineVectorStoreDir} pull`, { env: process.env }, (err) => {
          if (err) {
            console.log(`Failed to pull latest changes: ${err.message}`);
            reject(err);
          } else {
            console.log(`Pulled latest changes for vector store`);
            resolve(true);
          }
        });
      } else {
        // 如果不存在，则执行 git clone 克隆项目
        exec(
          `git clone git@gitlab.com:cs-vscode-plugins/vector_store.git ${this.offlineVectorStoreDir}`,
          { env: process.env },
          (err) => {
            if (err) {
              console.log(`Failed to clone vector store: ${err.message}`);
              reject(err);
            } else {
              console.log(`Cloned vector store`);
              resolve(true);
            }
          },
        );
      }
    });
    this.loadingStatusBarItem.text = '$(loading~spin) 加载实时向量数据';
    // this.store = await createOnlineStore(this.projectDir);
    this.ready = true;
    this.loadingStatusBarItem.hide();
  }

  async enhance(prompt: string, suffix: string) {
    const promptLines = prompt.split('\n');
    const suffixLines = suffix.split('\n');
    // 前后五行内容
    const query = promptLines.slice(-1).join('\n') + suffixLines.slice(0, 1).join('\n');

    // const [onlineDoc] = (await this.store?.onlineVectorStore?.similaritySearch(query, 1)) || [];
    // const [offlineDoc] = (await this.store?.offlineVectorStore?.similaritySearch(query, 1)) || [];
    // const onlineContent = onlineDoc.pageContent;
    // const offlineContent = offlineDoc.pageContent;

    //     const enhancedContent = `
    // ${promptLines.slice(0, -2).join('\n')}
    // /**
    //  * 线上仓库参考代码：${JSON.stringify(offlineContent)}
    //  * 当前仓库参考代码：${JSON.stringify(onlineContent)}
    //  * 优先参考当前仓库代码，无参考意义再参考线上仓库代码
    //  * 根据参考的代码结合上下文变量进行调整以满足需求
    //  */
    // ${promptLines.slice(-2).join('')}`;

    return '';
  }
}
