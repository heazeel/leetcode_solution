import { window, env, Uri } from 'vscode';
import { getUserId } from '../utilities/common';
import { Register } from './base';

type MessageType = 'getToken' | 'login';

export interface MessageReceived {
  type: MessageType;
  isBtn: boolean;
}

export default class AuthRegister extends Register<MessageReceived> {
  public messageName = 'auth';

  public async jumpToLogin(uuid: string) {
    try {
      const url = `https://test.com/crow/login/?uuid=${uuid}&callback=vscode://chaoshi-f2e-team.crow`;
      await env.openExternal(Uri.parse(url));
    } catch (err) {
      console.error(err);
    }
  }

  public async handleContent(content: MessageReceived) {
    const { type, isBtn } = content;
    const token = await this.getToken();
    if (type === 'getToken') {
      this.delegate.postMessage('auth', { token: token || '' });
    } else if (type === 'login') {
      const actionText = '登录';
      const uuid = getUserId();
      // webview点击登录
      if (isBtn) {
        await this.jumpToLogin(uuid);
      } else {
        // vscode弹窗登录
        const result = await window.showInformationMessage(
          'Crow Copilot 未登录，请先登录',
          actionText,
        );
        if (result === actionText) {
          await this.jumpToLogin(uuid);
        }
      }
    } else if (type === 'getUserInfo') {
      // 返回用户信息
      const userInfo = await this.secretStorage?.getItem('userInfo');
      this.delegate.postMessage('getUserInfo', { userInfo: JSON.parse(userInfo) || {} });
    }
  }
}
