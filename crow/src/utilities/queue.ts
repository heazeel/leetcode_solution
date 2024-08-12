import EventEmitter from 'events';

export class Queue<T> extends EventEmitter {
  private queue: T[] = [];
  private callback: (item: T) => void;
  private processing: boolean = false;
  private stopFlag: boolean = false;
  private sleepTime: number;

  constructor(callback: (item: T) => void, sleepTime: number = 500) {
    super();
    this.callback = callback;
    this.sleepTime = sleepTime;
    this.processQueue();
  }

  private shift(): T | undefined {
    return this.queue.shift();
  }

  private isEmpty(): boolean {
    return this.queue.length === 0;
  }

  private async processQueue() {
    this.processing = true;
    while (this.processing) {
      if (this.isEmpty() && this.stopFlag) {
        this.emit('emptyQueue');
        this.destroy();
        break;
      }

      if (!this.isEmpty()) {
        let item = this.shift();
        if (item) {
          await this.callback(item);
        }
      } else {
        // 如果队列为空，等待一段时间再检查
        await new Promise((resolve) => setTimeout(resolve, this.sleepTime));
      }
    }
  }

  public destroy() {
    this.processing = false;
    this.queue = [];
    this.stopFlag = false;
  }

  public push(message: T) {
    this.queue.push(message);
  }

  public stopPush() {
    this.stopFlag = true;
  }
}
