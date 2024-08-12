import { window, workspace, env, Uri } from 'vscode';
import axios from 'axios';
import { Register } from './base';
import { Shortcut, PromptParams } from '../utilities/shortcut';
import { TextEditorDelegate } from '../utilities/editor';
import { GlobalState } from '../utilities/state';
import { CROW_USER_INFO } from '../constants';

type Method =
  | 'getFormatPrompt'
  | 'getPromptFromFactory'
  | 'jumpToPromptFactory'
  | 'codeLenFormatPrompt';

export interface CallParameter {
  method: Method;
  key: string;
  params?: PromptParams;
}

export default class ShortcutRegister extends Register<CallParameter> {
  public messageName = 'shortcut';

  public async handleContent(content: CallParameter) {
    const { method, key, params } = content;
    if (method === 'getFormatPrompt' && key) {
      const prompt = Shortcut.formatPrompt(key, params);
      const editor = window.activeTextEditor;
      const inputValue = params?.__inputValue;
      let showText = '';
      if (editor) {
        const workspacePath = workspace.workspaceFolders?.[0].uri.path;
        const filePath = editor.document.uri.path.replace(`${workspacePath}/`, '');
        const language = editor.document.languageId;
        const selection = editor.selection;
        const prefix = `${language} ${filePath} ${selection.start.line}-${selection.end.line}`;
        const selectedText = TextEditorDelegate.getSelectedText(editor);
        showText = `\`\`\`${prefix}\n${selectedText}\n\`\`\``;
      }

      if (inputValue) {
        showText += `\n ${inputValue}`;
      }

      if (showText && prompt) {
        this.delegate.postMessage('getFormatPromptSuccess', {
          showText, // 展示在前台的内容
          prompt, // 实际提交的内容
          promptKey: key,
        });
      }
    }

    // codeLens中快捷方法使用
    if (method === 'codeLenFormatPrompt' && key && params) {
      const { showText, prompt } = params;

      this.delegate.postMessage('getCodeLenFormatPromptSuccess', {
        showText, // 展示在前台的内容
        prompt, // 实际提交的内容
        promptKey: key,
      });
    }
  }
}
