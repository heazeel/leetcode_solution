import { ExtensionContext, OutputChannel, window } from 'vscode';
import safeStringify from 'fast-safe-stringify';
import { getUserInfo } from './common';
import Package from '../../package.json';

// 日志系统
export class Logger {
  public static instance: Logger;
  // public trace: Core;

  private constructor(context?: ExtensionContext) {
    const userInfo = getUserInfo(context);

    // const trace = TraceSdk({
    //   pid: 'crow',
    //   env: `v${Package.version}`,
    //   uid: userInfo.userId,
    //   username: userInfo.username,
    // });

    // trace.install();
    // this.trace = trace;
  }

  static getInstance(context?: ExtensionContext): Logger {
    if (!Logger.instance || context) {
      Logger.instance = new Logger(context);
    }
    return Logger.instance;
  }

  logCustom(...message: any) {
    const msgName = message[0];
    const msgContent = message[1] || {};

    // this.trace.logCustom({
    //   p1: 'crow-log',
    //   c1: msgName,
    //   c2: safeStringify(msgContent),
    // });

    console.log({
      p1: 'crow-log',
      c1: msgName,
      c2: safeStringify(msgContent),
    });
  }

  log(...message: any) {
    console.log('[CROW LOG]', ...message);
    if (!message.length) {
      return;
    }

    this.logCustom(...message);
  }

  logApi(content: any) {
    // this.trace.logApi(content);
    console.log(content);
  }

  error(...message: any) {
    console.error('[CROW ERROR]', ...message);
    this.logCustom(...message);
  }

  warn(...message: any) {
    console.warn('[CROW WARN]', ...message);
    this.logCustom(...message);
  }
}

export class LogDecorator {
  /**
   * 在方法执行前打印日志
   * @param namespace 名称空间
   * @param content 日志内容
   * @returns 原始方法调用结果
   */
  static log(namespace: string, ...content: any) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = function (...args: any) {
        Logger.instance.log(`[${namespace}]`, ...content);
        return originalMethod.call(this, ...args);
      };

      return descriptor;
    };
  }

  /**
   * 在方法执行前打印参数
   * @param namespace 名称空间
   * @returns 原始方法调用结果
   */
  static logCallArguments(namespace: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = function (...args: any) {
        Logger.instance.log(`[${namespace}] - ${propertyKey}`, ...args);
        return originalMethod.call(this, ...args);
      };

      return descriptor;
    };
  }
  /**
   * 打印异步返回的结果数据
   * @param namespace 名称空间
   * @returns 原始方法调用结果
   */
  static logAsyncCallResult<ReturnType>(namespace: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any) {
        const result: ReturnType = await originalMethod.call(this, ...args);
        Logger.instance.log(`[${namespace}] - ${propertyKey}`, result);
        return result;
      };

      return descriptor;
    };
  }
}

class OutputChannelLogger {
  private outputChannel: OutputChannel;

  constructor() {
    this.outputChannel = window.createOutputChannel('Crow Copilot');
  }

  private getCurrentTime() {
    const date = new Date();
    const datePart = date.toLocaleDateString('en-CA');
    const timePart = date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const millisecondsPart = ('00' + date.getMilliseconds()).slice(-3);
    return `${datePart} ${timePart}.${millisecondsPart}`;
  }

  public log(message: string) {
    const time = this.getCurrentTime();
    this.outputChannel.appendLine(`[${time}] ${message}`);
    console.log(message);
  }

  public clear() {
    this.outputChannel.clear();
  }

  public show() {
    this.outputChannel.show(true);
  }

  public dispose() {
    this.outputChannel.dispose();
  }
}

const outputChannel = new OutputChannelLogger();

export { outputChannel };
