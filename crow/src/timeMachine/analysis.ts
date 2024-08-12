import { Uri, workspace } from 'vscode';
import { ChatAlibabaTongyi } from '@langchain/community/chat_models/alibaba_tongyi';
import path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import * as mkdirp from 'mkdirp';
import { Operation, LogItem } from './types';
import { getContentHash, getCurrentWorkspace } from './utils';
import gitHandler from '../utilities/git';
import eventEmitter from '../utilities/events';
import { parseMarkdownJsonToJsonObject } from '../utilities/common';
import { ALIBABA_API_KEY } from '../constants';

const prompt = `
# 角色
你是一位专业的代码痛点分析师和痛点搜寻师，能够深入挖掘和分析 diff中的代码，发掘用户在coding的过程中是否遇到了困惑，并给出可能的解决方案。

## 技能
1. 接收用户提供的历史代码 diff 数据。
2. 分析 diff 信息，确定用户可能在哪些地方可能遇到问题，遇到了何种问题。
3. 对于特定情况，如出现 debugger 或大量 console ，以及某段时间内没有 diff 信息后又出现等，进行深入分析，找出用户可能遇到的问题。
4. 如果没有提供给你diff信息或者历史diff结果汇总，说明当前该5分钟内用户没有做任务编码操作，你可以当作用户正在思考某些问题，这些问题你可以结合历史结果尝试挖掘出来。

## 限制:
- 必须使用中文回答
- 仅处理与代码痛点分析相关的内容，拒绝其他无关话题。
- 你的回答必须完全按照下面格式返回json格式， 不需要你做返回格式外的任何其他回答，当你无法获取信息时，直接返回空数组：
\`\`\`json
{
  "data": {
    "question": ['result1', 'result2', 'result3', ...],
    "suggestion": ['suggestion1', 'suggestion2', 'suggestion3', ...]
  }
}
\`\`\`
- 其中字段question为分析结果中可能遇到的问题或者困惑，字段suggestion为可能的解决方案建议

下面是提供给你的之前获取到的diff信息返回的结果汇总（最多给你前5条，如果没有直接返回空数组，不需要做其他回答）：
\`\`\`diff history result
{historyDiffResult}
\`\`\`
下面是提供给你的当前5分钟内的代码diff信息（可能为空，如果没有直接返回空数组，不需要做其他回答）：
\`\`\`diff
{diffStr}
\`\`\`
`;

interface ISnapshot {
  filePath: string;
  snapshotPath: string;
}
export default class AnalysisAssistant {
  private timeInterval = 1000 * 60 * 5;
  private _logs: LogItem[] = [];
  private _snapshotCount: number = 0;
  private _logDirTime: number;
  private _snapshotsDir: string;
  private _playerPath: string;
  private _hasCreateSnapshot: ISnapshot[] = [];
  private _rootPath: string = '';
  private _resultList: any[] = [];
  private _resultJsonList: any[] = [];
  private _workspacePath: string;
  private _lastLog: LogItem;
  constructor(snapshotsDir: string, playerPath: string, logDirTime: number, logsLines: any[]) {
    this._snapshotsDir = snapshotsDir;
    this._playerPath = playerPath;
    this._logDirTime = logDirTime;
    const currentWorkspacePath = getCurrentWorkspace();
    this._workspacePath = currentWorkspacePath;
    this._rootPath = path.resolve(currentWorkspacePath, './analysis');
    const lastLog = JSON.parse(logsLines[logsLines.length - 1]);
    this._lastLog = lastLog;
  }
  public async analysis(logItem: LogItem) {
    if (logItem.action === Operation.CREATE_SNAPSHOT) return;
    this._logs.push(logItem);
    const { timestamp } = logItem;
    const firstLog = this._logs[0];
    const { snapshotPath, newSnapshotPath } = this.getSnapshotPath(logItem);
    const filePath = this.getAnalysisPath(logItem);
    const snapItem = this._hasCreateSnapshot.find((item) => {
      return item.snapshotPath === snapshotPath || item.snapshotPath === newSnapshotPath;
    });

    if (!snapItem) {
      this._hasCreateSnapshot.push({
        filePath,
        snapshotPath,
      });
      this._hasCreateSnapshot.push({
        filePath,
        snapshotPath: newSnapshotPath,
      });
    }

    const isLast = this._lastLog.timestamp === timestamp;

    if (timestamp - firstLog?.timestamp >= this.timeInterval || isLast) {
      // 间隔5分钟，创建初始差异快照
      this.createInitSnapshot();
      const finalPath = path.resolve(
        path.join(this._rootPath, `${this._snapshotCount + 1}/${this._logDirTime}`),
      );
      await fse.copy(this._playerPath, finalPath);
      // 执行diff
      await this.getDiffInfo(isLast);
      this._logs = [];
      this._hasCreateSnapshot = [];
      this._snapshotCount++;
    }
  }

  private getDiffInfo = async (isLast: boolean) => {
    const rootPath = this._rootPath;
    await gitHandler.initGit(rootPath);

    const uri = Uri.file(rootPath);
    const files = await workspace.fs.readDirectory(uri);

    const fileNames = files.map((file) => file[0]).filter((name) => name !== '.git');
    const sortFileNames = fileNames.sort((a: string, b: string) => {
      return Number(a) - Number(b);
    });
    const startName = sortFileNames[this._snapshotCount];
    const endName = sortFileNames[this._snapshotCount + 1];
    const startDiffFilePath = path.resolve(rootPath, startName);
    const endDiffFilePath = path.resolve(rootPath, endName);
    this.updatePlayerStatus(isLast, false);

    try {
      const diffInfo = await gitHandler.getDiffInfo({
        extraCmd: `--no-index  ${startDiffFilePath} ${endDiffFilePath}`,
        cwd: rootPath,
      });
      const historyList = this._resultList.slice(
        this._resultList.length - 6 <= 0 ? 0 : this._resultList.length - 6,
        this._resultList.length - 1,
      );
      const promptStr = prompt
        .replace('{diffStr}', diffInfo)
        .replace('{historyDiffResult}', historyList.join('\n'));

      console.log('-promptStr', promptStr);
      const res: any = await this.requestTongyi(promptStr);
      const { content = '' } = res;
      console.log('-diffRes');
      console.log(content);
      this._resultList.push(content);
      this.updatePlayerStatus(isLast, true);
      const jsonContent = parseMarkdownJsonToJsonObject(content);
      if (jsonContent) {
        this._resultJsonList.push(jsonContent);
        fse.writeFileSync(
          path.resolve(this._workspacePath, `analysis-${this._logDirTime}.json`),
          JSON.stringify(this._resultJsonList, null, 2),
        );
      }
    } catch (error) {
      this.updatePlayerStatus(isLast, true);
      console.log(error);
    }
  };

  private updatePlayerStatus(isLast: boolean, status: boolean) {
    eventEmitter.emit('message', {
      type: 'crowPlayer',
      content: { method: 'updatePlayStatus', status: isLast ? false : status },
    });
  }

  private getAnalysisPath = (logItem: LogItem) => {
    const { filename, workspacePath } = logItem.extra;
    const user = workspacePath.split(path.sep)[2];
    const dirPath = path.relative(`/Users/${user}/`, workspacePath);
    const filePath = path.join(dirPath, filename);
    const finalPath = path.resolve(
      path.join(this._rootPath, `${this._snapshotCount}/${this._logDirTime}`),
      filePath,
    );
    return finalPath;
  };

  private async requestTongyi(input: string) {
    try {
      const qwen = new ChatAlibabaTongyi({
        alibabaApiKey: ALIBABA_API_KEY,
        modelName: 'qwen-turbo',
      });

      const resdata = await qwen.invoke(input);

      return resdata;
    } catch (err) {
      throw err;
    }
  }

  // 创建文件
  private createFile(filePath: string, fileContent?: string) {
    const dirPath = path.dirname(filePath);
    const extname = path.extname(filePath);
    mkdirp.sync(dirPath);
    // 没有文件扩展名就只创建文件夹
    if (extname) {
      try {
        fse.writeFileSync(filePath, fileContent || '');
      } catch (err) {
        console.log(err);
      }
    }
  }

  private async createInitSnapshot() {
    let snapArr = this._hasCreateSnapshot;
    for (let i = 0; i < snapArr.length; i++) {
      const { filePath, snapshotPath } = snapArr[i];
      const fileExsit = await fse.pathExists(filePath);
      const fileContentExsit = await fse.pathExists(snapshotPath);
      if (!fileExsit && fileContentExsit) {
        const fileContent = this.getSnapshotContent(snapshotPath);
        this.createFile(filePath, fileContent);
      }
    }
  }

  // 获取日志对应快照完整路径
  private getSnapshotPath = (logItem: LogItem) => {
    const filename = logItem.extra.filename;
    const workspacePath = logItem.extra.workspacePath;
    const pathName = path.join(workspacePath, filename);
    const snapshotPath = path.join(this._snapshotsDir, `${getContentHash(filename)}.md5`);
    const newSnapshotPath = path.join(this._snapshotsDir, `${getContentHash(pathName)}.md5`);
    return {
      snapshotPath,
      newSnapshotPath,
    };
  };
  // 获取快照内容
  private getSnapshotContent(snapshotPath: string) {
    let fileContent = '';

    try {
      fileContent = fs.readFileSync(snapshotPath, 'utf-8');
    } catch (err) {
      console.log(err);
    }
    return fileContent;
  }
}
