import fs from 'fs';
import path from 'path';
import fse from 'fs-extra';
import vscode, { window, workspace, Uri, Position, Range } from 'vscode';
import { getContentHash, getCurrentWorkspace } from './utils';
import { Operation, LogItem, IContentChangeItem } from './types';
import * as mkdirp from 'mkdirp';
import { MessageDelegate } from '../utilities/message';
import AnalysisAssistant from './analysis';

export default class FileAssistant {
  private _snapshotsDir: string;

  private _createdFiles: string[];

  private _executeQueue: LogItem[];

  private _init = true;

  private _logDirTime: number = 0;

  private _delegate?: MessageDelegate;

  private _logRecord: any[] = [];
  private _logRecordFile: any[] = [];
  private _timeCritical: number[] = [];
  private _hasReadSnapshotInfo: { [key: string]: boolean } = {};
  private _analysisAssistant: AnalysisAssistant;
  private _logsLine: any[] = [];

  private _logPath: string = '';

  constructor(snapshotsDir: string, logPath: string, delegate?: MessageDelegate) {
    this._snapshotsDir = snapshotsDir;
    this._createdFiles = [];
    this._executeQueue = [];
    this._logDirTime = new Date().getTime();
    this._logPath = logPath;
    const currentWorkspacePath = getCurrentWorkspace();
    const playerPath = path.resolve(
      path.join(currentWorkspacePath, `./player/${this._logDirTime}`),
    );

    this.getLogFormat();
    this.getTimeCritical();
    this._analysisAssistant = new AnalysisAssistant(
      snapshotsDir,
      playerPath,
      this._logDirTime,
      this._logsLine,
    );

    if (delegate) {
      this._delegate = delegate;
    }
  }

  get logRecord() {
    return this._logRecord;
  }

  async execute(logItem: LogItem) {
    if (this._executeQueue.length === 0) {
      this._init = true;
    }
    this._executeQueue.push(logItem);
    if (this._init) {
      this._init = false;
      await this.executeOpration(logItem);
    }
  }

  private async executeOpration(logItem: LogItem) {
    const { extra, timestamp } = logItem;
    const { filePath = '', newFilePath = '' } =
      logItem.action !== Operation.OPEN_LINK ? this.getFilePath(extra) : {};
    if (logItem.action === Operation.CREATE_FILE) {
      await this.checkFileExsit(logItem);
    } else if (logItem.action === Operation.DELETE_FILE) {
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        console.log(err);
      }
    } else if (logItem.action === Operation.OPEN_FILE) {
      await this.openFile(logItem, filePath);
    } else if (logItem.action === Operation.CLOSE_FILE) {
      try {
        if (this._createdFiles.indexOf(filePath) !== -1) {
          // 先尝试打开文件文件，再关闭，因为vscode只能关闭当前激活的文件
          await this.openFile(logItem, filePath);
          const activeEditor = vscode.window.activeTextEditor;
          if (activeEditor) {
            await this.saveFile();
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
          }
        }
      } catch (err) {
        console.log(err);
      }
    } else if (logItem.action === Operation.SAVE_FILE) {
      await this.saveFile();
    } else if (logItem.action === Operation.EDIT_FILE) {
      // edit时判断是否在createSnapshot之后，之前的话就不进行编辑，避免快照和编辑的时序问题导致快照还原错乱
      const { snapPath, newSnapPath } = this.getSnapshotFileName(logItem);
      if (this._hasReadSnapshotInfo[snapPath] || this._hasReadSnapshotInfo[newSnapPath]) {
        await this.createLogDiffFile(timestamp);
        const { contentChanges = [] } = extra;
        await this.openFile(logItem, filePath);
        await this.editText(contentChanges);
      }
    } else if (logItem.action === Operation.ACTIVE_FILE) {
      await this.openFile(logItem, filePath);
    } else if (logItem.action === Operation.MOVE_FILE) {
      await this.checkFileExsit(logItem);
      try {
        await fs.promises.rename(filePath, newFilePath);
        await fs.promises.unlink(filePath);
      } catch (err) {
        console.log(err);
      }
    } else if (logItem.action === Operation.ADD_COMMENT) {
      // 增加评论
      const { comment } = extra;
      if (comment) {
        this._delegate?.postMessage('crowPlayer', {
          method: 'comment',
          comment,
        });
      }
    } else if (logItem.action === Operation.OPEN_LINK) {
      const { pageContent, url } = extra;
      this._delegate?.postMessage('crowPlayer', {
        method: 'openLink',
        res: {
          pageContent,
          url,
        },
      });
    } else if (logItem.action === Operation.CREATE_SNAPSHOT) {
      const { extra } = logItem;
      const { filename } = extra;
      const fileArr = filename.split('/');
      const snapshotName = fileArr[fileArr.length - 1];
      this._hasReadSnapshotInfo[snapshotName] = true;
    }
    // AI痛点分析
    await this._analysisAssistant.analysis(logItem);
    // 执行完毕后继续下一个action
    this._executeQueue.shift();

    const newLogItem = this._executeQueue[0];
    if (newLogItem) {
      await this.executeOpration(newLogItem);
    }
  }

  // 首次复制目录
  private async createLogSnaptshot(index: number) {
    const items = this._logRecordFile[index];
    if (items && items.length) {
      for (let i = 0; i < items.length; i++) {
        await this.checkFileExsit(items[i]);
      }
    }
  }

  // 创建diff文件
  private async createLogDiffFile(timestamp: number) {
    const index = this._timeCritical.findIndex((time) => time === timestamp);
    if (index > -1) {
      const number = Math.floor(index / 2);
      const type = index % 2 === 0 ? 'start' : 'end';
      try {
        const currentWorkspacePath = getCurrentWorkspace();
        const playerPath = path.resolve(path.join(currentWorkspacePath, `./player/`));
        const finalPath = path.resolve(
          path.join(currentWorkspacePath, `/commit/${number}-${timestamp}-${type}/`),
        );
        const exists = await fse.pathExists(finalPath);
        if (type === 'start' && !exists) {
          await this.createLogSnaptshot(number);
        }
        await fse.copy(playerPath, finalPath);
      } catch (err) {
        console.log(err);
      }
    }
  }

  private getTimeCritical() {
    for (let i = 0; i < this._logRecord.length; i++) {
      const [startLog, endLog] = this._logRecord[i];
      this._timeCritical.push(startLog.timestamp);
      this._timeCritical.push(endLog.timestamp);
    }
  }

  private async getLogFormat() {
    const logData = fs.readFileSync(this._logPath).toString('utf-8');
    const lines = logData.split('\n');
    for (let i = 0; i < lines.length; i++) {
      try {
        const logItem = JSON.parse(lines[i]);
        if (logItem.action === Operation.EDIT_FILE) {
          this.dealLogs(logItem);
        }
      } catch (e) {
        console.log(e);
      }
      if (i === lines.length - 1) {
        const tenMinutes = 1000 * 60 * 10;
        const newlogRecord = [];
        for (let i = 0; i < this._logRecord.length; i++) {
          const currentRecord = this._logRecord[i] || [];
          if (currentRecord.length === 2) {
            const [startLog, endLog] = currentRecord;
            const startTimestamp = startLog.timestamp;
            const endTimestamp = endLog.timestamp;
            if (endTimestamp - startTimestamp >= tenMinutes) {
              newlogRecord.push(currentRecord);
            }
          }
        }
        this._logRecord = newlogRecord;
      }
    }

    this._logsLine = lines;

    // 删除commit文件夹
    const currentWorkspacePath = getCurrentWorkspace();
    const finalPath = path.join(currentWorkspacePath, 'commit');
    await fse.remove(finalPath);
  }

  private deduplicationFilename(checkedArr: any, checkedItem: any) {
    const repeatItem = checkedArr.find((item: any) => {
      const workspacePath = item.extra.workspacePath;
      const filename = item.extra.filename;
      return (
        workspacePath === checkedItem.extra.workspacePath && filename === checkedItem.extra.filename
      );
    });
    return repeatItem;
  }

  // 处理日志
  private dealLogs(logItem: LogItem) {
    const logRecord = this._logRecord;
    // 记录文件名
    const logRecordFile = this._logRecordFile;
    const fiveMinutes = 1000 * 60 * 5;
    const tenMinutes = 1000 * 60 * 10;
    if (!logRecord.length) {
      logRecord.push([logItem]);
      logRecordFile.push([logItem]);
    } else {
      const lastRecord = logRecord[logRecord.length - 1] || [];
      const lastRecordFile = logRecordFile[logRecordFile.length - 1] || [];
      const { timestamp } = logItem;
      if (lastRecord[1]) {
        const time = timestamp - lastRecord[1].timestamp;
        // 当前日志比上一个日志的时间大于五分钟
        if (time > fiveMinutes) {
          // 上一个日志的开始时间比结束时间大于10分钟则记录，否则废弃，重新计算
          if (lastRecord[1].timestamp - lastRecord[0].timestamp > tenMinutes) {
            logRecord.push([logItem]);
            logRecordFile.push([logItem]);
          } else {
            logRecord[logRecord.length - 1] = [logItem];
            logRecordFile[logRecordFile.length - 1] = [logItem];
          }
        } else {
          lastRecord[1] = logItem;
          // 小于五分钟，直接覆盖
          const repeatItem = this.deduplicationFilename(lastRecordFile, logItem);
          if (!repeatItem) {
            lastRecordFile.push(logItem);
          }
        }
      } else {
        lastRecord[1] = logItem;
        const repeatItem = this.deduplicationFilename(lastRecordFile, logItem);
        if (!repeatItem) {
          lastRecordFile.push(logItem);
        }
      }
    }
  }

  private async openFile(logItem: LogItem, filePath: string) {
    try {
      await this.checkFileExsit(logItem);
      // 打开文件
      await this.openTextEdit(filePath);
    } catch (err) {
      console.log(err);
    }
  }

  private async editText(contentChanges: IContentChangeItem[]) {
    const activeEditor = window.activeTextEditor;
    if (activeEditor) {
      for (let content of contentChanges) {
        const { range, text, rangeLength } = content || {};
        if (range.length) {
          const startLine = range[0].line;
          const startCharacter = range[0].character;
          const endLine = range[1].line;
          const endCharacter = range[1].character;

          const startPosition = new Position(startLine, startCharacter);
          const endPosition = new Position(endLine, endCharacter);

          const editRange = new Range(startPosition, endPosition);
          activeEditor.selection = new vscode.Selection(startPosition, endPosition);
          activeEditor.revealRange(editRange, vscode.TextEditorRevealType.InCenter);
          await activeEditor.edit((editBuilder) => {
            try {
              editBuilder.replace(editRange, text);
            } catch (err) {
              console.log(err);
            }
          });
        }
      }
    }
  }

  private async saveFile() {
    const activeEditor = window.activeTextEditor;
    if (activeEditor) {
      try {
        await activeEditor.document.save();
      } catch (err) {
        console.log(err);
      }
    }
  }

  private async openTextEdit(filePath: string) {
    const activeEditor = window.activeTextEditor;
    let activeFilepath = '';
    if (activeEditor) {
      const activeDocument = activeEditor.document;
      activeFilepath = activeDocument.fileName;
    }
    if (activeFilepath === filePath) {
      return;
    }
    try {
      const document = await workspace.openTextDocument(Uri.file(filePath));
      await window.showTextDocument(document);
    } catch (err) {
      console.log(err);
    }
  }

  // 检查文件是否存在前置操作，没有就根据快照创建
  private async checkFileExsit(logItem: LogItem, customPath?: string) {
    const { extra } = logItem;
    const { filePath, dirPath } = this.getFilePath(extra, customPath);

    try {
      // 未创建过的文件进行检查
      if (this._createdFiles.indexOf(filePath) === -1) {
        const { fileContent } = this.getSnapshotContent(logItem);
        this.createFile(filePath, fileContent);
        return {
          filePath,
          dirPath,
        };
      }
    } catch (err) {
      console.log(err);
    }
  }

  // 获取快照名
  private getSnapshotFileName(logItem: LogItem) {
    const filename = logItem.extra.filename;
    const workspacePath = logItem.extra.workspacePath;
    const newSnapPath = `${getContentHash(path.join(workspacePath, filename))}.md5`;
    const snapPath = `${getContentHash(filename)}.md5`;
    return {
      snapPath,
      newSnapPath,
    };
  }

  // 获取快照内容
  private getSnapshotContent(logItem: LogItem) {
    const filename = logItem.extra.filename;
    const workspacePath = logItem.extra.workspacePath;
    const pathName = path.join(workspacePath, filename);
    const snapshotPath = path.join(this._snapshotsDir, `${getContentHash(pathName)}.md5`);
    let fileContent = '';
    let hasSnapshot = true;
    try {
      fileContent = fs.readFileSync(snapshotPath, 'utf-8');
    } catch (err) {
      try {
        const bottomPath = path.join(this._snapshotsDir, `${getContentHash(filename)}.md5`);
        fileContent = fs.readFileSync(bottomPath, 'utf-8');
      } catch (error) {
        console.log(error);
        hasSnapshot = false;
      }
      console.log(err);
    }
    return {
      fileContent,
      hasSnapshot,
    };
  }

  // 获取文件与文件目录路径
  private getFilePath(
    extra: { filename: string; workspacePath: string; newFilename?: string },
    customPath?: string,
  ) {
    const { filename, workspacePath, newFilename } = extra;
    const user = workspacePath.split(path.sep)[2];
    // const dir = path.relative(os.homedir(), workspacePath);
    // const dirPath = Buffer.from(dir).toString('base64');
    const dirPath = path.relative(`/Users/${user}/`, workspacePath);
    const filePath = path.join(dirPath, filename);
    let newFilePath = '';
    if (newFilename) {
      newFilePath = path.join(dirPath, filename);
    }
    const currentWorkspacePath = getCurrentWorkspace();
    const finalPath = path.resolve(
      path.join(currentWorkspacePath, customPath || `./player/${this._logDirTime}`),
      filePath,
    );
    const finalNewPath = path.resolve(
      path.join(currentWorkspacePath, customPath || `./player/${this._logDirTime}`),
      newFilePath,
    );
    return {
      filePath: finalPath,
      newFilePath: finalNewPath,
      dirPath: path.dirname(finalPath),
    };
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
        this._createdFiles.push(filePath);
      } catch (err) {
        console.log(err);
      }
    }
  }
}
