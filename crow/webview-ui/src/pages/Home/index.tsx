import { vscode } from '@/utilities/vscode';
import { useEffect, useState } from 'react';
import { Button, Image } from 'antd';
import { useNavigate } from 'react-router-dom';
import PromptConfigs from '@/prompts/promptConfigs.json';
import { CROW_ICON } from '@/constant';
import { StorageKey } from '@/utilities/storage';

import './index.css';

export default function Home() {
  const navigate = useNavigate();
  const mode = localStorage.getItem('isDevMindMode') || '';
  const [uuid, setUuid] = useState('init');

  // 初始化prompt存储
  const initPromptStorage = () => {
    const promptArr = JSON.parse(JSON.stringify(PromptConfigs));
    const storedData = localStorage.getItem(StorageKey.PromptStore);

    let storeArr: any[] = [];
    if (storedData) {
      storeArr = JSON.parse(storedData);
    }

    if (!storeArr.length) {
      localStorage.setItem(StorageKey.PromptStore, JSON.stringify(promptArr));
    } else {
      // webview里存的，和插件内置的，对比后，相同的prompt
      let samePromptArr: number[] = [];

      // webview里存的内置的，和插件内置的，对比后，缺少的prompt
      let deletePromptArr: number[] = [];

      storeArr.forEach((item: any, index: number) => {
        const findIndex = promptArr.findIndex((i: any) => i.key === item.key);
        if (findIndex > -1) {
          samePromptArr.push(findIndex);
          storeArr[index] = promptArr[findIndex];
        } else {
          if (item.isBuiltin) {
            deletePromptArr.push(item.key);
          }
        }
      });

      if (samePromptArr.length) {
        promptArr.forEach((item: any, index: number) => {
          if (!samePromptArr.includes(index)) {
            storeArr.unshift(item);
          }
        });
      }

      if (deletePromptArr.length) {
        storeArr = storeArr.filter((item) => !deletePromptArr.includes(item.key));
      }

      localStorage.setItem(StorageKey.PromptStore, JSON.stringify(storeArr));
    }
  };

  const login = () => {
    vscode.postMessage({ type: 'auth', content: { type: 'login', isBtn: true } });
  };

  const handleMessage = (event: MessageEvent) => {
    const { data = {} } = event || {};
    const { type, content } = data || {};

    // 登出
    if (type === 'logOut') {
      navigate('/');
    }

    // 获取登录信息
    if (type === 'auth') {
      const { token } = content || {};
      if (token) {
        setUuid(token);
      } else {
        setUuid('');
        vscode.postMessage({ type: 'auth', content: { type: 'login', isBtn: false } });
      }
    }

    if (type === 'isDevMindMode') {
      const mode = localStorage.getItem('isDevMindMode') || '';
      if (`${content}` === `${mode}`) {
        return;
      }

      localStorage.setItem('isDevMindMode', content);
      navigate(content ? '/devMind' : '/chat');
      return;
    }

    if (type === 'useTestMod') {
      navigate('/test');
      return;
    }

    if (type === 'useUploadMode') {
      navigate('/upload');
      return;
    }
  };

  // 监听消息
  useEffect(() => {
    // @ts-ignore
    if (window.isPlayerMode) {
      navigate('/player');
    }

    vscode.postMessage({ type: 'auth', content: { type: 'getToken' } });
    initPromptStorage();
    window.addEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (uuid && uuid !== 'init') {
      navigate(mode === 'true' ? '/devMind' : '/chat');
    }
  }, [uuid]);

  // 登录主页
  if (!uuid) {
    return (
      <div className="login-page">
        <div className="login-img">
          <Image width={200} src={CROW_ICON} preview={false} />
        </div>
        <div className="login-text-wrapper">
          <p>欢迎使用Crow Copilot</p>
          <Button className="login-btn" type="primary" onClick={login}>
            登录
          </Button>
        </div>
      </div>
    );
  }
  return null;
}
