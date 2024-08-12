import { window, Uri, ExtensionContext } from 'vscode';
import axios from 'axios';
import { Logger } from './logger';
import { SecretStorage } from './secretStorage';
import { getUserId } from './common';
import { ISecretStorage } from '../types';
import { MessageDelegate } from './message';
import { GlobalState } from '../utilities/state';
import { CROW_LOGIN, CROW_USER_INFO } from '../constants';

// 处理监听外部uri抽象类
export abstract class UriHandler {
  public abstract handleUri(uri: Uri): Promise<any>;
  public userId: string;

  constructor(readonly context: ExtensionContext) {
    this.userId = getUserId();
    window.registerUriHandler({
      handleUri: this.handleUri.bind(this),
    });
  }
}

// 鉴权uri监听处理
export class AuthUriHandler extends UriHandler {
  public secretStorage: ISecretStorage;
  constructor(readonly delegate: MessageDelegate, readonly context: ExtensionContext) {
    super(context);
    const secretStorage = new SecretStorage(context.secrets);
    this.secretStorage = secretStorage;
    // this.secretStorage.deleteItem('uuid');
    // GlobalState.set(this.context, CROW_LOGIN, false);
  }

  // 获取用户信息
  public getUserInfo = async (uuid: string): Promise<any> => {
    return await new Promise((resolve, reject) => {
      const url = `https://test.com/api/crow/getInfoByUuid?uuid=${uuid}`;
      axios({
        method: 'get',
        url,
      })
        .then((response) => {
          const { data: resData = {} } = response || {};
          const { data = {}, message, success } = resData || {};
          if (!success) {
            reject(message);
          }
          resolve({ ...data });
        })
        .catch((error) => {
          console.error(error);
          reject(error);
        });
    });
  };

  // 监听外部uri跳转
  public async handleUri(uri: Uri) {
    const query = new URLSearchParams(uri.query);
    const uuid = query.get('uuid') || '';
    try {
      if (uuid) {
        this.secretStorage.setItem('uuid', uuid);
        // 获取用户信息
        const userInfo = await this.getUserInfo(uuid);
        if (userInfo) {
          this.secretStorage.setItem('userInfo', JSON.stringify(userInfo));
          this.delegate.postMessage('loginSuccess', true);
          // 同步登录状态
          (await GlobalState.set(this.context, CROW_USER_INFO, userInfo)).sync();
          (await GlobalState.set(this.context, CROW_LOGIN, true)).sync();
          // 登录后更新logger的用户信息
          Logger.getInstance(this.context);
        }
      }
    } catch (error) {
      Logger.instance.error(`[Extension Login] - getInfoError`, error);
    }
    return Promise.resolve();
  }
}
