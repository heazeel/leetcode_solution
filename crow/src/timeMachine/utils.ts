import crypto from 'crypto';
import { workspace } from 'vscode';

/**
 * 是否补0
 * @param {number} timestamp - 返回格式化的日期数字
 * @returns {string} - 返回修改后的日期字符串
 */
const addZero = (timestamp: number, addZero: boolean = false) => {
  if (timestamp < 10 && addZero) {
    return `0${timestamp}`;
  }
  return String(timestamp);
};
/**
 * 根据给定的Unix时间戳获取日期字符串（格式：YYYY-MM-DD）
 * @param {number} timestamp - Unix时间戳（毫秒为单位）
 * @returns {string} - 返回格式化的日期字符串
 */
export const getDateStringFromTimestamp = (timestamp: number, isAddZero: boolean = false) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = addZero(date.getMonth() + 1, isAddZero);
  const day = addZero(date.getDate(), isAddZero);
  return `${year}-${month}-${day}`;
};

/**
 * 使用MD5算法计算给定字符串内容的哈希值
 * @param {string} content - 需要计算哈希值的字符串内容
 * @returns {string} 返回一个16进制表示的MD5哈希值
 */
export const getContentHash = (content: string) => {
  return crypto.createHash('md5').update(content).digest('hex');
};

/**
 * 创建一个setInterval函数，但在每次执行前会等待指定的延迟时间。
 * 该函数返回一个清除定时器的方法，调用此方法将停止执行。
 *
 * @param {() => void} func - 需要定时执行的无参函数。
 * @param {number} delay - 每次执行前的延迟时间（单位：毫秒）。
 * @returns {() => void} - 一个清除定时器的方法，调用此方法将停止执行。
 */
export const setIntervalWithTimeout = (func: () => void, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  /**
   * 内部函数，用于设置延迟执行和递归调用。
   */
  function wrapper() {
    timeoutId = setTimeout(() => {
      func();
      wrapper();
    }, delay);
  }
  // 启动内部函数，开始定时执行
  wrapper();
  // 返回清除定时器的方法
  return () => clearTimeout(timeoutId);
};

export const getCurrentWorkspace = () => {
  const currentWorkspace = workspace.workspaceFolders?.[0];
  const { uri } = currentWorkspace || {};
  const currentWorkspacePath = uri?.fsPath || '';
  return currentWorkspacePath;
};
