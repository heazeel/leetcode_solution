import { Transform, TransformCallback } from 'stream';
import { Uri, Webview, window, ColorThemeKind, ExtensionContext } from 'vscode';
import * as os from 'os';
import cp from 'child_process';
import async from 'async';
import { machineIdSync } from 'node-machine-id';
import { ReadableStream } from 'web-streams-polyfill';
import fetch from 'cross-fetch';
import { GlobalState } from './state';
import { CROW_USER_INFO } from '../constants';

export function compatibleLangChain() {
  try {
    const globalVar: any = globalThis;
    const [version] = process.versions.node.split('.').map(Number);
    if (version <= 16) {
      globalVar.ReadableStream = ReadableStream;
      globalVar.fetch = fetch;
    }
  } catch (error) {
    console.log(error);
  }
}

// 生成uuid
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getUserId(): string {
  const userId = machineIdSync();
  return userId;
}

export function getMachineUserInfo() {
  const userInfo = os.userInfo();
  const userId = getUserId();
  return {
    ...userInfo,
    userId,
  };
}

export function getUserInfo(context?: ExtensionContext): { username: string; userId: string } {
  if (context) {
    const userInfo = GlobalState.get(context, CROW_USER_INFO).value;
    if (!userInfo) {
      return getMachineUserInfo();
    }

    return {
      username: userInfo.userNick,
      userId: userInfo.workId,
    };
  } else {
    return getMachineUserInfo();
  }
}

export function getUserTheme(kind: ColorThemeKind): string {
  let themeKind = 'light';
  switch (kind) {
    case ColorThemeKind.Light:
    case ColorThemeKind.HighContrastLight:
      themeKind = 'light';
      break;
    case ColorThemeKind.Dark:
    case ColorThemeKind.HighContrast:
      themeKind = 'dark';
      break;
  }

  return themeKind;
}

/**
 * A helper function which will get the webview URI of a given file or resource.
 *
 * @remarks This URI can be used within a webview's HTML as a link to the
 * given file/resource.
 *
 * @param webview A reference to the extension webview
 * @param extensionUri The URI of the directory containing the extension
 * @param pathList An array of strings representing the path to a file/resource
 * @returns A URI pointing to the file/resource
 */
export function getUri(webview: Webview, extensionUri: Uri, pathList: string[]) {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
}

/**
 * A helper function that returns a unique alphanumeric identifier called a nonce.
 *
 * @remarks This function is primarily used to help enforce content security
 * policies for resources/scripts being executed in a webview context.
 *
 * @returns A nonce
 */
export function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * A helper function that executes a command in a terminal.
 * @param command The command to execute
 */
export function execTerminal(command: string) {
  const terminal = window.createTerminal('Crow Terminal');
  terminal.show();
  terminal.sendText(command);
}

export function parseTBStarStreamData<T>(input: string): T[] {
  // 初始化
  let dataObjects: T[] = [];
  const spaceFilter = input.split('\n');
  spaceFilter.map((item) => {
    if (item.startsWith('data:{')) {
      const jsonPart = item.slice(5);
      try {
        const dataObject = JSON.parse(jsonPart);
        dataObjects.push(dataObject);
      } catch (error) {}
    }
  });
  return dataObjects;
}

/**
 * A helper function that parses stream data.
 * @param input The input stream data
 * @returns The parsed stream data
 */
export function parseStreamData<T>(input: string, slicePos?: number): T[] {
  // 按行分割数据
  const lines = input.split('\n');
  // 初始化
  let dataObjects: T[] = [];

  for (const line of lines) {
    // 判断是否是'data:'开头
    if (line.startsWith('data:')) {
      // 获取json数据
      const jsonPart = line.slice(slicePos || 6);

      // parse the JSON
      try {
        const dataObject = JSON.parse(jsonPart);
        dataObjects.push(dataObject);
      } catch (error) {}
    } else {
      try {
        const dataObject = JSON.parse(line);
        dataObjects.push(dataObject);
      } catch (error) {}
    }
  }

  return dataObjects;
}

export class LineSplitTransform extends Transform {
  private buffer: string;

  constructor() {
    super();
    this.buffer = '';
  }

  _transform(chunk: any, _: BufferEncoding, callback: Function) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');

    if (lines.length === 1) {
      // Incomplete line, wait for more data
      this.buffer = lines[0];
    } else {
      // Process complete lines
      for (let i = 0; i < lines.length - 1; i++) {
        this.push(lines[i]);
      }
      this.buffer = lines[lines.length - 1];
    }

    callback();
  }

  _flush(callback: Function) {
    if (this.buffer.length > 0) {
      this.push(this.buffer);
    }
    callback();
  }
}

export class TimeoutDetector extends Transform {
  private timeout: number;
  private timer: NodeJS.Timeout;

  constructor(timeout: number, options?: any) {
    super(options);
    this.timeout = timeout;
    this.timer = setTimeout(this.handleTimeout.bind(this), this.timeout);
  }

  private resetTimer() {
    clearTimeout(this.timer);
    this.timer = setTimeout(this.handleTimeout.bind(this), this.timeout);
  }

  private handleTimeout() {
    this.emit('timeout');
  }

  clearTimer() {
    clearTimeout(this.timer);
  }

  _transform(chunk: any, _: BufferEncoding, callback: Function) {
    this.resetTimer();
    this.push(chunk);
    callback();
  }

  _final(callback: (error?: Error | null | undefined) => void) {
    clearTimeout(this.timer);
    callback();
  }
}

// 子进程执行命令
export function childProcessExec(command: string, options?: cp.CommonExecOptions) {
  return new Promise<string>((resolve, reject) => {
    if (options) {
      options.env = process.env;
    }
    cp.exec(command, options || { env: process.env }, (error, stdout, stderr) => {
      if (error && !stdout) {
        reject(error);
      }

      resolve(stdout);
    });
  });
}

export type AsyncFunction<T> = {
  (callback: (err?: Error | null, result?: T) => void): void;
};

type AsyncReflectFunction<T> = {
  (callback: (err?: Error | null, result?: { error?: Error; value?: T }) => void): void;
};

type ResultType<T> = { error: Error | null | undefined; result: (T | undefined)[] | undefined };

// 并发请求控制
export function limitRequest<T, IgnoreError = false>({
  taskList,
  limit,
  ignoreError,
}: {
  taskList: AsyncFunction<T>[];
  limit: number;
  ignoreError: IgnoreError;
}): Promise<ResultType<T>> {
  let ignoredTaskList: AsyncReflectFunction<T>[] = [];

  if (ignoreError) {
    ignoredTaskList = taskList.map((task) => async.reflect(task));
  }

  return new Promise((resolve, reject) => {
    if (ignoreError) {
      return async.parallelLimit(ignoredTaskList, limit, function (error, result) {
        const _result = result?.map((item) => item?.value);
        resolve({
          error,
          result: _result,
        });
      });
    }

    async.parallelLimit(taskList, limit, function (error, result) {
      resolve({
        error,
        result,
      });
    });
  });
}

export interface QuestionSet {
  questions: string[];
}

export function parseMarkdownJsonToJsonObject<T>(markdownString: string): T | null {
  const jsonMatch = markdownString.match(/```json([\s\S]*?)```/);
  if (!jsonMatch || !jsonMatch[1]) {
    console.error('No valid JSON code block found in the input string.');
    return null;
  }

  try {
    const trimStr = jsonMatch[1].trim();
    const jsonStr = trimStr.replaceAll('`', '');
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.log(error);
    return null;
  }
}
