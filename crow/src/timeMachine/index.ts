import fs from 'fs';
import path from 'path';
import { window, workspace, Uri } from 'vscode';
import { Operation, LogItem } from './types';
import { getDateStringFromTimestamp, getContentHash, setIntervalWithTimeout } from './utils';

// import Player from './player';
// const player = new Player(path.join(process.env.HOME!, '.crow/logs'));
// player.accelerate(10);
// player.play();
// setTimeout(() => {
//   console.log('跳跃===========================================');
//   player.fastForward(1711696864437);
// }, 5_000);
/**
 * 向指定文件追加内容。
 * 如果文件所在的目录不存在，会递归创建该目录。
 *
 * @param {string} filePath - 要追加内容的文件路径。
 * @param {string} content - 要追加到文件中的内容。
 */
const appendFile = (filePath: string, content: string) => {
  const fileDir = path.dirname(filePath);
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true });
  }
  fs.appendFileSync(filePath, content);
};

/**
 * LogBuffer 类用于存储日志项，当达到一定数量时，会调用提供的回调函数清空缓冲区。
 * @class
 * @template T - 存储的日志项类型，默认为 LogItem 类型。
 */
class LogBuffer<T = LogItem> {
  /**
   * 日志缓冲区，用于存储日志项。
   * @private
   * @type {T[]}
   */
  private _buffer: T[] = [];

  /**
   * 清空缓冲区的方法
   */
  flush: () => void;

  /**
   * 构造函数，接收一个回调函数，用于在缓冲区满时清空日志。
   * @param {function(buffer: T[]): void} flushCallback - 清空缓冲区的回调函数。
   */
  constructor(flushCallback: (buffer: T[]) => void) {
    this.flush = () => {
      flushCallback(this._buffer);
      this._buffer = [];
    };
  }

  /**
   * 添加一个日志项到缓冲区。如果缓冲区长度达到 200，会调用 flush 方法清空缓冲区并重置缓冲区为一个空数组。
   * @param {T} item - 要添加的日志项。
   */
  add(item: T) {
    this._buffer.push(item);
    if (this._buffer.length >= 200) {
      this.flush();
    }
  }
}

export default class TimeMachine {
  /**
   * 工作区目录路径
   */
  workspacePath: string;

  /**
   * 日志存储目录
   */
  private _logsDir;

  /**
   * 快照目录 .crow/logs/snapshots
   * 按需添加快照，文件名为 [date]/[hash].[ext]
   * 生成快照条件：上报日志时发现是文件内容操作，且无当天对应文件的快照
   */
  private _snapshotDir;

  /**
   * 移除定时器方法
   * @returns {void} 无返回值
   */
  _clearTimer: () => void;

  /**
   * 日志缓冲区
   * 定时往本地日志文件追加内容
   */
  private _logBuffer: LogBuffer;

  /**
   * 构造函数，初始化工作空间路径及相关目录。
   * @param workspacePath {string} - 工作空间的绝对路径。
   *
   * 此构造函数设置以下属性：
   * - `this.workspacePath`: 保存传入的工作空间路径。
   * - `this._logsDir`: 一个路径，用于存放日志文件，位于用户目录的'.crow/logs/'子目录下。
   * - `this._snapshotDir`: 一个路径，用于存放快照文件，位于用户目录的'.crow/logs/snapshots/'子目录下。
   *
   * 此外，构造函数还创建了以下对象和定时器：
   * - `this._logBuffer`: 一个日志缓冲区，当接收到日志项时，会调用传递的回调函数`_storeLogItem`。
   * - `this._clearTimer`: 一个每秒触发一次的定时器，用于清空日志缓冲区。
   */
  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this._logsDir = path.join(this.saveDir, '/logs/');
    this._snapshotDir = path.join(this._logsDir, '/snapshots/');

    this._logBuffer = new LogBuffer((logItems) => {
      this._storeLogItem(logItems);
    });
    this._clearTimer = setIntervalWithTimeout(() => {
      this._logBuffer.flush();
    }, 5_000);

    // 如果无法获取到用户目录，会在本地项目创建 .crow 目录，所以需要 git 忽略
    if (!this.userDir) {
      const gitignorePath = path.join(workspacePath, '.gitignore');
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      if (!gitignoreContent.includes('.crow/')) {
        fs.appendFileSync(gitignorePath, '\n.crow/');
      }
    }
  }

  /**
   * 获取存储目录路径
   * @returns {string} 返回当前工作区路径下的'.crow'目录路径
   */
  get saveDir() {
    return path.join(this.userDir || this.workspacePath, '.crow/');
  }

  /**
   * 获取用户的主目录路径。
   * @returns {string} 返回用户家目录的路径，基于环境变量HOME（Unix-like系统）或USERPROFILE（Windows系统）。
   */
  get userDir() {
    const userHome = process.env.HOME || process.env.USERPROFILE;
    return userHome;
  }

  /**
   * 存储日志项
   * @param items - 待处理的日志项数组，每个日志项包含一个时间戳。
   * @private
   */
  private _storeLogItem(items: LogItem[]) {
    // 如果没有日志项，直接返回
    if (items.length === 0) return;

    // 初始化日期变量和内容变量
    let date: string | undefined = undefined;
    let content: string = '';

    // 存储结果的数组
    const results: { date: string; content: string }[] = [];

    // 遍历日志项
    for (const item of items) {
      // 从时间戳获取日期字符串
      const itemDate = getDateStringFromTimestamp(item.timestamp);

      // 如果当前日期未定义，使用日志项的日期
      if (!date) date = itemDate;

      // 如果当前日期与日志项的日期相同，将日志项添加到内容中
      if (date === itemDate) {
        content += `${JSON.stringify(item)}\n`;
      } else {
        // 如果日期不同，将当前日期和内容添加到结果数组中，并重置日期和内容
        results.push({ date, content });
        date = itemDate;
        content = '';
      }
    }

    // 处理最后一个日志项，如果有的话
    if (content && date) {
      results.push({ date, content });
    }

    results.forEach((result) => {
      const { date, content } = result || {};
      appendFile(path.join(this._logsDir, `${date}.log`), content);
    });
  }

  /**
   * 创建快照日志，根据传入的日志项生成对应的快照文件并记录操作日志。
   *
   * @param item - 包含日志信息的对象，包含 `timestamp` 和可选的 `extra` 属性。
   *   - `timestamp`: 快照的时间戳。
   *   - `extra`: 可选对象，包含 `filename`（原始文件名）。
   */
  createSnapshotLog(item: LogItem) {
    const { timestamp, extra } = item || {};
    const { filename } = extra || {};
    const date = getDateStringFromTimestamp(timestamp);
    const snapshotWithDateDir = path.join(this._snapshotDir, `${date}`);
    const fullPath = path.join(this.workspacePath, filename);
    const snapshotFilename = path.join(snapshotWithDateDir, `${getContentHash(fullPath)}.md5`);
    // 如果 snapshotWithDateDir 下已经有同名文件，则跳过
    if (!fs.existsSync(snapshotFilename)) {
      fs.mkdirSync(snapshotWithDateDir, { recursive: true });
      // 针对内容进行哈希处理，然后作为标题创建快照文件 [hash].md5
      // 获取编辑状态的文件内容
      const activeEditor = window.activeTextEditor;
      const fileUri = Uri.from({
        scheme: 'file',
        path: fullPath,
      });
      if (activeEditor && activeEditor.document.uri.toString() === fileUri.toString()) {
        const fileContent = activeEditor.document.getText();
        // 使用 workspace.fs.writeFile 方法写入文件
        workspace.fs.writeFile(Uri.file(snapshotFilename), Buffer.from(fileContent));
        // 添加一个快照日志项
        this._logBuffer.add({
          workId: item.workId,
          action: Operation.CREATE_SNAPSHOT,
          timestamp: timestamp,
          extra: {
            filename: path.relative(this._logsDir, snapshotFilename),
            workspacePath: this._logsDir,
          },
        });
      }
    }
  }

  /**
   * 记录日志项。根据日志项中的操作类型和时间戳，可能创建快照文件。
   * @param item - 日志项对象，包含操作、时间戳和额外信息。
   * @param {string} item.action - 操作类型。
   * @param {number} item.timestamp - 操作发生的时间戳。
   * @param {object} [item.extra] - 额外信息，如文件名等。
   * @param {string} [item.extra.filename] - 当操作为文件激活时，文件的原始路径。
   */
  log(item: LogItem) {
    const { action, extra } = item || {};
    const { filename } = extra || {};
    // 如果文件路径包含 .crow 目录，则忽略
    if (filename.includes('.crow/')) {
      return;
    }
    this._logBuffer.add(item);
    // 如果是文件被编辑，且当日无对应快照文件，则创建下快照
    if (action === Operation.EDIT_FILE) {
      this.createSnapshotLog(item);
    }
  }

  /**
   * 清除日志缓冲区和清除定时器
   * 通常在应用退出时调用
   */
  clear() {
    this._logBuffer.flush();
    this._clearTimer();
  }
}
