import globby from 'globby';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import logger from '../helpers/logger';
import axios from 'axios';
import * as cp from 'child_process';
import async from 'async';
import { machineIdSync } from 'node-machine-id';

export interface IPackageInfo {
  version: string;
  name: string;
}

// 获取某个路径下的所有文件路径
export const getPathList = async (pathName: string): Promise<string[]> => {
  let PathList: string[] = [];
  try {
    PathList =
      (await globby.sync(pathName, {
        cwd: path.resolve(__dirname, '..'),
        deep: 2,
      })) || [];
  } catch (error: any) {
    logger.error(error);
  }
  return PathList;
};

// 获取当前包的信息
export const getPkgInfo = (): IPackageInfo => {
  const jsonPath = path.join(__dirname, '../../package.json');
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const jsonResult = JSON.parse(jsonContent);
  return jsonResult as IPackageInfo;
};

// 获取包最新版本
export const getLatestVersion = async (pkgName: string) => {
  const url = decodeURIComponent(
    `https://registry.anpm.alibaba-inc.com/${pkgName}`,
  );
  const res = await axios(url);
  const manifest = res.data;
  const latestVersion = manifest['dist-tags'].latest;
  return latestVersion;
};

// 获取指定目录路径
export const getRootFile = (name: string): string => {
  let currentDir = __dirname;

  while (currentDir !== path.dirname(currentDir)) {
    if (currentDir.endsWith(name)) {
      break;
    }
    currentDir = path.dirname(currentDir);
  }

  return currentDir;
};

// 获取配置文件路径
export const getConfigFilePath = (): string => {
  const dirPath = getRootFile('crow-cli');
  const configFilePath = path.join(dirPath, '.crowclirc.json');

  return configFilePath;
};

// 读取配置信息
export const getConfig = () => {
  const configFilePath = getConfigFilePath();
  const config = fs.readJSONSync(configFilePath);
  return config;
};

// 递归Error信息，获取最内层的错误信息
export const getInnermostErrorMessage = (error: Error): string => {
  let innermostError = error;
  while (innermostError.message.includes('Error: ')) {
    innermostError = new Error(innermostError.message.replace('Error: ', ''));
  }
  return innermostError.message;
};

// 获取用户信息，优先使用配置文件中的信息，否则使用机器信息
export function getUserInfo() {
  const config = getConfig();
  let userId = machineIdSync();
  let username = os.userInfo().username;

  if (config.userId && config.username) {
    userId = config.userId;
    username = config.username;
  }

  return {
    username,
    userId,
  };
}

// 子进程执行命令
export function childProcessExec(
  command: string,
  options?: cp.CommonExecOptions,
) {
  return new Promise<string>((resolve, reject) => {
    cp.exec(command, options || {}, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

// 检查是否是git目录
export const checkGitRepo = async (): Promise<boolean> => {
  try {
    const stdout = await childProcessExec(
      'git rev-parse --is-inside-work-tree',
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );

    if (stdout.trim() === 'true') {
      return true;
    }

    throw new Error('当前目录不在Git工作树中');
  } catch (error) {
    throw new Error(`${process.cwd()}: 当前仓库没有初始化Git`);
  }
};

// 并发请求控制
export const limitRequest = (
  taskList: async.AsyncFunction<any>[],
  limit: number,
) => {
  return new Promise((resolve, reject) => {
    async.parallelLimit(taskList, limit, function (error, result) {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

/**
 * 对于中文文本来说，1个token通常对应1-2个汉字；
 * 对于英文文本来说，1个token通常对应3-5个字母
 * 对于符号和换行制表符来说，1个token通常对应1个符号
 */
export const tokenization = (str) => {
  let chinese = str.match(/[\u4e00-\u9fa5]/g);
  let english = str.match(/[a-zA-Z]/g);
  let symbols = str.match(/[\p{P}\p{S}]/gu);
  let newLines = str.match(/\n/g);
  let tabs = str.match(/\t/g);
  let numbers = str.match(/[0-9]/g);

  const size =
    (chinese?.length || 0) / 1.5 +
    (english?.length || 0) / 5 +
    (symbols?.length || 0) +
    (newLines?.length || 0) +
    (tabs?.length || 0) +
    (numbers?.length || 0);

  return Math.ceil(size);
};
