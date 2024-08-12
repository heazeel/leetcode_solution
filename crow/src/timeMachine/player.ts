import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { window } from 'vscode';
import { LogItem } from './types';
import { getDateStringFromTimestamp, setIntervalWithTimeout } from './utils';
import FileAssistant from './assistant';
import { MessageDelegate } from '../utilities/message';

// 实现一个 FIFO 队列
class Queue<T = any> {
  private _maxSize;

  private _queue: T[] = [];

  constructor(maxSize: number = 50) {
    this._maxSize = maxSize;
  }

  // 判断缓冲区是否存满，实际可能会超出最大值
  get isFull() {
    return this.size >= this._maxSize;
  }

  get size() {
    return this._queue.length;
  }

  enqueue(item: T) {
    this._queue.push(item);
  }

  dequeue() {
    return this._queue.shift();
  }

  peek(): T | undefined {
    return this._queue[0];
  }
}

// 视频播放状态：播放、暂停、结束
enum PlayerStatus {
  PLAYING,
  PAUSED,
  END,
}

export default class Player {
  private _logFilePath: string;

  private _assistant: FileAssistant;

  private _readline: readline.Interface;

  private _logQueue: Queue<LogItem> = new Queue(50);

  private _status: PlayerStatus = PlayerStatus.PAUSED;

  // 记录第一条日志的时间戳，方便计算播放进度
  private _firstLogTimestamp: number | null = null;

  private _progressTime: number = 0;

  private _accelerateRate: number = 1;

  private _timestampPlayFinish: boolean = true;

  // 是否跳过当前空闲时间
  private _jumpIdleTime: boolean = false;

  // 分析模式
  private _analysis: boolean = false;

  private _delegate: MessageDelegate | undefined;

  constructor(
    logsDir: string,
    dateString: string = getDateStringFromTimestamp(Date.now()),
    firstLogTimestamp?: number,
    delegate?: MessageDelegate,
  ) {
    this._delegate = delegate;
    this._logFilePath = path.join(logsDir, `${dateString}.log`);
    this._assistant = new FileAssistant(
      path.join(logsDir, `snapshots/${dateString}`),
      this._logFilePath,
      delegate,
    );
    if (firstLogTimestamp) {
      this._timestampPlayFinish = false;
      this._firstLogTimestamp = firstLogTimestamp;
    }

    let fileStreamEnd = false;
    const delay = 16;
    const clear = setIntervalWithTimeout(() => {
      if (this._status === PlayerStatus.PLAYING) {
        this._progressTime += delay * this._accelerateRate;

        const logItem = this._logQueue.peek();
        if (logItem) {
          if (!this._firstLogTimestamp) {
            // | firstLogTimestamp -------------- | logTimestamp => logProgressTime
            this._firstLogTimestamp = logItem.timestamp;
          }
          const logProgressTime = logItem.timestamp - this._firstLogTimestamp;
          // 是否跳过空闲时间 || 分析模式
          if (this._jumpIdleTime || this._analysis) {
            this._progressTime = logProgressTime;
          }
          // 判断最新的日志时间是否达到可展示的状态
          if (this._progressTime >= logProgressTime) {
            // 让助手根据下一条日志做出响应
            const item = this._logQueue.dequeue();
            if (item) {
              this._assistant.execute(item);
              if (!this._analysis) this._jumpIdleTime = false;
            }
          } else {
            if (!this._timestampPlayFinish) {
              this._delegate &&
                this._delegate.postMessage('crowPlayer', {
                  method: 'jumpEnd',
                });
            }
            this._timestampPlayFinish = true;
          }
        }

        // 如果日志队列没有满，继续从文件流读取内容
        if (!this._logQueue.isFull) {
          this._readline.resume();
        }
      }
      // 文件流读取结束，且日志队列为空，则停止播放
      if (fileStreamEnd && this._logQueue.size === 0) {
        this._status = PlayerStatus.END;
        clear();
        window.showInformationMessage('文件操作结束');
      }
    }, delay);

    this._readline = readline.createInterface({
      input: fs.createReadStream(this._logFilePath, { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    });

    this._readline.on('line', (data) => {
      const logItem: LogItem = JSON.parse(data.toString());
      this._logQueue.enqueue(logItem);

      if (this._logQueue.isFull) {
        this._readline.pause();
      }
    });

    this._readline.on('close', () => {
      fileStreamEnd = true;
      window.showInformationMessage('日志流读取结束');
    });
  }

  get currentProgressTimestamp() {
    if (this._progressTime && this._firstLogTimestamp) {
      return this._progressTime + this._firstLogTimestamp;
    }
    return null;
  }

  get status() {
    return this._status;
  }

  get timestampPlayFinish() {
    return this._timestampPlayFinish;
  }

  get jumpIdleTime() {
    return this._jumpIdleTime;
  }

  get logRecord() {
    return this._assistant.logRecord;
  }

  fastForward(time: number) {
    this._progressTime += time;
  }

  accelerate(rate: number) {
    this._accelerateRate = rate;
  }

  setIdleTime(status: boolean) {
    this._jumpIdleTime = status;
  }

  setAnalysis(status: boolean) {
    this._analysis = status;
  }

  pause() {
    if (this._status === PlayerStatus.PLAYING) {
      this._status = PlayerStatus.PAUSED;
      this._readline.pause();
    }
  }

  play() {
    if (this._status === PlayerStatus.PAUSED) {
      this._status = PlayerStatus.PLAYING;
      this._readline.resume();
    }
  }
}
