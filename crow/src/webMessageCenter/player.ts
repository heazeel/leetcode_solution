import { window, workspace, Uri, commands } from 'vscode';
import fs from 'fs';
import fse from 'fs-extra';
import path from 'path';
import { Register } from './base';
import { getCurrentWorkspace, getDateStringFromTimestamp } from '../timeMachine/utils';
import Player from '../timeMachine/player';
import { LogItem, Operation } from '../timeMachine/types';
import { limitRequest } from '../utilities/common';
import type { AsyncFunction } from '../utilities/common';
import GitHandler from '../utilities/git';
import { ALIBABA_API_KEY } from '../constants';
import { ChatAlibabaTongyi } from '@langchain/community/chat_models/alibaba_tongyi';

type Method = 'getLogFiles';
type SummaryData = { start: number; end: number; content: string };

export interface CallParameter {
  method: Method;
  params?: any;
  status?: boolean;
}

interface IPlayer {
  [propName: string]: Player;
}

const template = `根据下面的diff信息,用一句话总结这次变动的目的。
要求:
- 使用中文
- 尽可能简短
- 不要描述改动细节

\`\`\`diff
{diffStr}
\`\`\`
`;

export default class PlayerRegister extends Register<CallParameter> {
  public messageName = 'crowPlayer';
  private playerInstance: IPlayer = {};
  private timeClear: any;
  // private _timestampPlayFinish: boolean = false;
  private _logsData: any = {};

  private async deleteDir() {
    await workspace.saveAll(false);
    await commands.executeCommand('workbench.action.closeAllEditors');
    const currentWorkspacePath = getCurrentWorkspace();
    const playerPath = path.join(currentWorkspacePath, '/player');
    const fileExsit = await fse.pathExists(playerPath);
    if (fileExsit) {
      await fse.remove(playerPath);
    }
  }

  private getLogItemIndex(lines: string[], timestamp: number) {
    return lines.findIndex((item) => {
      try {
        const logItem = JSON.parse(item);
        return logItem.timestamp === timestamp;
      } catch (e) {
        return false;
      }
    });
  }

  private getNewLine(item: LogItem, timestamp: number, comment: string): LogItem {
    return {
      workId: item.workId,
      action: Operation.ADD_COMMENT,
      timestamp,
      extra: Object.assign({}, item.extra, {
        comment,
      }),
    };
  }

  // 增加评论
  private async addLogComment(
    fileName: string,
    curStamp: number,
    nextStamp: number,
    comment: string,
  ) {
    let lines: string[] = [];
    const currentWorkspacePath = getCurrentWorkspace();
    // 日志目录
    const logPath = path.join(currentWorkspacePath, '/logs');
    const dateName = fileName.split('.')[0];
    const logFilePath = path.join(logPath, `${dateName}.log`);
    if (this._logsData[logFilePath] && this._logsData[logFilePath].length) {
      lines = this._logsData[logFilePath];
    } else {
      const logData = await fs.promises.readFile(logFilePath, 'utf-8');
      lines = logData.split('\n');
    }
    const lineIndex = this.getLogItemIndex(lines, nextStamp);
    if (lineIndex > -1) {
      try {
        const line = JSON.parse(lines[lineIndex]);
        const newLine = this.getNewLine(line, curStamp, comment);
        lines.splice(lineIndex, 0, JSON.stringify(newLine));
        this._logsData[logFilePath] = lines;
        const fileContent = lines.join('\n');
        await fs.promises.writeFile(logFilePath, fileContent);
      } catch (e) {
        console.log(e);
      }
    }
  }

  private async getPlayer(fileName: string) {
    const currentWorkspacePath = getCurrentWorkspace();
    // 日志目录
    const logPath = path.join(currentWorkspacePath, '/logs');
    const dateName = fileName.split('.')[0];
    let player: Player;
    const playerInstance = this.playerInstance[fileName];
    if (!playerInstance || (playerInstance && playerInstance.status === 2)) {
      await this.deleteDir();
      player = new Player(logPath, dateName, 0, this.delegate);
      this.playerInstance[fileName] = player;
    } else {
      player = this.playerInstance[fileName];
    }
    return player;
  }

  private mergeLogs(logs: LogItem[], chromeLogs: any[]) {
    const newLogs = [];
    const noChangesLogs = [];
    const newChromeLogs = JSON.parse(JSON.stringify(chromeLogs));
    for (let i = 0; i < logs.length; i++) {
      const { timestamp, action, extra } = logs[i];
      const { filename, comment, pageContent, url } = extra;
      const newLog = {
        timestamps: timestamp,
        action,
        fileName: filename,
        comment: comment || '',
        pageContent,
        url,
      };
      noChangesLogs.push(JSON.stringify(logs[i]));
      newLogs.push(newLog);
      try {
        const { filterArr, noChangesFilterArr } = this.filterLogs(logs[i], newChromeLogs);
        if (filterArr.length) {
          newLogs.splice(i, 0, ...filterArr);
        }
        if (noChangesFilterArr.length) {
          noChangesLogs.splice(i, 0, ...noChangesFilterArr);
        }
      } catch (err) {
        console.log(err);
      }
    }
    return {
      newLogs,
      noChangesLogs,
    };
  }

  private filterLogs(log: LogItem, chromeLogs: any[]) {
    const filterArr = [];
    const noChangesFilterArr = [];
    for (let i = 0; i < chromeLogs.length; i++) {
      const { timestamp, action, extra } = chromeLogs[i] || {};
      const { pageContent, url } = extra;
      if (action === 'openLink' && log.timestamp > timestamp) {
        const newLog = {
          timestamps: timestamp,
          action,
          fileName: '',
          comment: '',
          pageContent,
          url,
        };
        filterArr.push(newLog);
        noChangesFilterArr.push(JSON.stringify(chromeLogs[i]));
        chromeLogs.splice(i, 1);
        i--;
      }
    }
    return {
      filterArr,
      noChangesFilterArr,
    };
  }

  private getChromeLogName(fileName: string) {
    const time = `${fileName.split('.')[0]} 00:00:00`;
    return getDateStringFromTimestamp(new Date(time).getTime(), true);
  }

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

  private async play(params: any) {
    const { fileName, speed } = params || {};
    if (!fileName) {
      return;
    }
    const player = await this.getPlayer(fileName);

    if (player) {
      if (speed) {
        player.accelerate(Number(speed));
      }
      player.play();
      if (!player.timestampPlayFinish) {
        this.delegate.postMessage(this.messageName, {
          method: 'jumpLoading',
        });
      }
      clearInterval(this.timeClear);
      this.timeClear = setInterval(() => {
        const playFinish = player.timestampPlayFinish;
        if (playFinish) {
          const timestamp = player.currentProgressTimestamp;
          this.delegate.postMessage(this.messageName, {
            method: 'playExecute',
            timestamp,
          });
        }
        if (player.status === 2) {
          clearInterval(this.timeClear);
          this.delegate.postMessage(this.messageName, {
            method: 'playEnd',
          });
        }
      }, 500);
    }
    return player;
  }

  private async playerJumpforward(params: any, logPath: string) {
    const { fileName, timestamp } = params || {};
    if (!fileName) {
      return;
    }

    const dateName = fileName.split('.')[0];
    const player = this.playerInstance[fileName];
    if (player) {
      player.pause();
      clearInterval(this.timeClear);
    }

    const newPlayer = new Player(logPath, dateName, timestamp, this.delegate);
    this.playerInstance[fileName] = newPlayer;

    await this.deleteDir();
  }

  public async handleContent(content: CallParameter) {
    const currentWorkspacePath = getCurrentWorkspace();
    // 日志目录
    const logPath = path.join(currentWorkspacePath, '/logs');
    const { method, params, status } = content;

    if (method === 'getLogFiles') {
      const root = workspace.workspaceFolders?.[0].uri.path;
      if (root) {
        const uri = Uri.file(`${root}/logs`);
        const files = await workspace.fs.readDirectory(uri);
        const filesName = files.map((file) => file[0]).filter((name) => name.endsWith('.log'));

        this.delegate.postMessage(this.messageName, {
          method,
          res: filesName,
        });

        // 写工作区配置，去除格式化
        let vscodeFolderPath = path.join(root, '.vscode');
        let settingsPath = path.join(vscodeFolderPath, 'settings.json');
        await workspace.fs.createDirectory(Uri.file(vscodeFolderPath));
        let settingsContent = new TextEncoder().encode(
          JSON.stringify(
            {
              'editor.formatOnSave': false,
              '[javascript]': {
                'editor.formatOnSave': false,
              },
              'prettier.enable': false,
              'eslint.enable': false,
            },
            null,
            2,
          ),
        );
        await workspace.fs.writeFile(Uri.file(settingsPath), settingsContent);
      }
      return;
    }

    if (method === 'getFileInfo') {
      this.playerInstance = {};
      const { fileName } = params || {};
      const root = workspace.workspaceFolders?.[0].uri.path;
      const time = this.getChromeLogName(fileName);
      let chromeLogs;
      const chromeLogPath = `${root}/logs/all.json`;
      try {
        const strLogs = await fs.promises.readFile(chromeLogPath, 'utf-8');
        chromeLogs = JSON.parse(strLogs);
      } catch (err) {
        console.log(err);
      }
      const chromeTimeLog = chromeLogs ? chromeLogs[time] || [] : [];
      const logPath = `${root}/logs/${fileName}`;
      const logData = await fs.promises.readFile(logPath, 'utf-8');
      const jsonData = logData
        .split('\n')
        .filter((line) => line)
        .map((line) => JSON.parse(line));
      const json = JSON.parse(JSON.stringify(jsonData, null, 2));
      const workId = json[0].workId;
      const { newLogs: timeLine, noChangesLogs } = this.mergeLogs(json, chromeTimeLog);
      const fileContent = noChangesLogs.join('\n');
      // 将浏览器日志与插件日志合并后重新写入日志，并去除浏览器日志中已经合并过的日志
      try {
        await fs.promises.writeFile(logPath, fileContent);
        delete chromeLogs[time];
        const chromeLogContent = JSON.stringify(chromeLogs);
        await fs.promises.writeFile(chromeLogPath, chromeLogContent);
      } catch (err) {
        console.log(err);
      }

      // const timeLine = json
      //   .map((item: any) => {
      //     return {
      //       timestamps: item.timestamp,
      //       action: item.action,
      //       fileName: item.extra.filename,
      //       comment: item.extra.comment || '',
      //     };
      //   })
      //   .filter((item: any) => item.action !== 'createSnapshot');

      const summaryPath = `${root}/logs/${fileName.split('.')[0]}.json`;
      let summary;
      try {
        summary = await fs.promises.readFile(summaryPath, 'utf-8');
      } catch (err) {}

      this.delegate.postMessage(this.messageName, {
        method,
        res: { timeLine, workId, summary: summary ? JSON.parse(summary) : [] },
      });

      await this.deleteDir();
    }

    // 增加评论
    if (method === 'addComment') {
      const { fileName, comment, curStamp, nextStamp } = params || {};
      this.addLogComment(fileName, curStamp, nextStamp, comment);
    }
    // 是否跳过空闲时间
    if (method === 'jumpIdleTime') {
      const { fileName, status } = params || {};
      if (!fileName) {
        return;
      }
      const player = await this.getPlayer(fileName);
      player.setIdleTime(status);
    }

    // 播放
    if (method === 'play') {
      await this.play(params);
    }

    // 跳转到指定位置
    if (method === 'jumpForward') {
      await this.playerJumpforward(params, logPath);
    }

    // 分析
    if (method === 'analysis') {
      const player = await this.play(params);
      if (player) {
        player.setAnalysis(true);
      }
    }

    // 暂停
    if (method === 'pause') {
      const { fileName } = params || {};
      if (!fileName) {
        return;
      }

      const player = this.playerInstance[fileName];
      if (player) {
        player.pause();
        clearInterval(this.timeClear);
      }
    }

    // 倍速播放
    if (method === 'speedPlay') {
      const { fileName, speed } = params || {};
      if (!fileName || !speed) {
        return;
      }

      const dateName = fileName.split('.')[0];
      const player = (this.playerInstance[fileName] =
        this.playerInstance[fileName] || new Player(logPath, dateName, 0, this.delegate));

      if (player) {
        player.accelerate(Number(speed));
      }
    }

    if (method === 'generateAISummary') {
      const { fileName } = params || {};

      const rootPath = `${currentWorkspacePath}/commit`;
      await GitHandler.initGit(rootPath);

      const uri = Uri.file(rootPath);
      const files = await workspace.fs.readDirectory(uri);

      const fileNames = files.map((file) => file[0]).filter((name) => name !== '.git');

      if (!fileNames.length) {
        this.delegate.postMessage(this.messageName, {
          method,
          res: { summary: [] },
        });
        return;
      }

      const group: any[] = [];
      let obj: { [key: string]: any } = {};
      fileNames.forEach((fileName, index) => {
        const splitName = fileName.split('-');
        const [groupIndex, timestamp, tag] = splitName;

        if (Number(groupIndex) === group.length) {
          if (Object.keys(obj).length === 0) {
            obj[tag] = {
              timestamp,
              fileName,
            };
          } else if (Object.keys(obj).length === 1) {
            obj[tag] = {
              timestamp,
              fileName,
            };
            group.push(obj);
            obj = {};
          }
        }
      });

      for (const item of group) {
        const diffInfo = await GitHandler.getDiffInfo({
          extraCmd: `--no-index ${item['start'].fileName} ${item['end'].fileName}`,
          cwd: rootPath,
        });
        item.diffInfo = diffInfo;
      }

      let taskList: AsyncFunction<SummaryData>[] = [];
      group.forEach((item) => {
        taskList.push((callback) => {
          this.requestTongyi(template.replace('{diffStr}', item.diffInfo))
            .then((res) => {
              const d: SummaryData = {
                start: Number(item.start.timestamp),
                end: Number(item.end.timestamp),
                content: res.content as string,
              };
              callback(null, d);
            })
            .catch((err) => {
              callback(err);
            });
        });
      });

      limitRequest<SummaryData, true>({ taskList, limit: 3, ignoreError: true }).then((res) => {
        const summaryData = res.result;
        if (summaryData) {
          const filePath = path.join(
            currentWorkspacePath,
            'logs',
            `${fileName.split('.')[0]}.json`,
          );
          fse.writeFile(filePath, JSON.stringify(summaryData));
          this.delegate.postMessage(this.messageName, {
            method,
            res: { summary: summaryData },
          });
        } else {
          this.delegate.postMessage(this.messageName, {
            method,
            res: { summary: [] },
          });
        }
      });
    }

    if (method === 'updatePlayStatus') {
      this.delegate.postMessage(this.messageName, {
        method,
        status,
      });
    }
  }
}
